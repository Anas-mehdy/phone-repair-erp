// Optional isolated PostgreSQL integration test, with no live DATABASE_URL use.
// Install @electric-sql/pglite in a temporary directory and set PGLITE_MODULE_PATH
// to its dist/index.js, then run: node --import tsx scripts/test-purchase-gifts.ts
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { createInventoryItem, addStock, adjustStock, updateInventoryGiftPolicy } from "../lib/services/inventoryService";
import { normalizeDeviceDetails } from "../lib/inventory-device";
import { makeDeviceLabel } from "../lib/device-label";
import { ensureInventoryLabelBarcode } from "../lib/services/inventoryDeviceService";
import { saveDraft, postPurchaseInvoice, lookupInventoryByIdentifier, type PurchaseDraftLineInput } from "../lib/services/purchaseReceivingService";

type Row = Record<string, unknown>;
type Database = {
  query: (sql: string, values?: unknown[]) => Promise<{ rows: Row[]; affectedRows?: number }>;
  exec: (sql: string) => Promise<unknown>;
  transaction: (run: (tx: Database) => Promise<unknown>) => Promise<unknown>;
  close: () => Promise<void>;
};

async function main() {
  const modulePath = process.env.PGLITE_MODULE_PATH ?? "@electric-sql/pglite";
  const { PGlite } = await import(modulePath);
  const pg: Database = await PGlite.create({ parsers: { 1700: (value: string) => new Prisma.Decimal(value) } });
  const temporary = mkdtempSync(join(tmpdir(), "masar-gift-test-"));
  const original = { transaction: prisma.$transaction, queryRaw: prisma.$queryRaw, count: prisma.inventoryItem.count, supplier: prisma.supplier.findFirst };
  const shop = "00000000-0000-4000-8000-000000000001";
  const user = "00000000-0000-4000-8000-000000000002";
  const supplier = "00000000-0000-4000-8000-000000000003";
  const item = "00000000-0000-4000-8000-000000000004";
  try {
    const baseline = readFileSync("prisma/schema.prisma", "utf8").replace(/^\s+giftAllowed\s+.*\n/gm, "").replace(/^\s+isGift\s+.*\n/gm, "").replace(/^\s+(?:isDevice|deviceModel|deviceCondition|batteryHealth|storageCapacity|deviceIdentifier|deviceDetails)\s+.*\n/gm, "");
    const schema = join(temporary, "schema.prisma");
    writeFileSync(schema, baseline);
    const sql = execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "diff", "--from-empty", "--to-schema-datamodel", schema, "--script"], { encoding: "utf8", env: { ...process.env, DATABASE_URL: "postgresql://unused:unused@127.0.0.1:1/unused" } });
    await pg.exec(sql);
    // Production SQL migrations provide these DB-side defaults; Prisma's generated
    // schema describes them as client defaults, so add them to this empty fixture.
    await pg.exec(`DO $$ DECLARE c record; BEGIN
      FOR c IN SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='id' AND data_type='uuid' LOOP
        EXECUTE format('ALTER TABLE %I ALTER COLUMN id SET DEFAULT gen_random_uuid()', c.table_name);
      END LOOP;
      FOR c IN SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='updatedAt' LOOP
        EXECUTE format('ALTER TABLE %I ALTER COLUMN "updatedAt" SET DEFAULT NOW()', c.table_name);
      END LOOP;
    END $$;`);
    await pg.query('INSERT INTO "Shop" (id,name) VALUES ($1,$2)', [shop, "Gift test shop"]);
    await pg.query('INSERT INTO "User" (id,email,name,"shopId") VALUES ($1,$2,$3,$4)', [user, "gift-test@example.invalid", "Owner", shop]);
    await pg.query('INSERT INTO "Supplier" (id,name,"shopId") VALUES ($1,$2,$3)', [supplier, "Supplier", shop]);
    await pg.query('INSERT INTO "InventoryItem" (id,"shopId",name,"unitCost","unitPrice",quantity) VALUES ($1,$2,$3,100,120,10)', [item, shop, "Existing product"]);
    await pg.exec(readFileSync("prisma/migrations/20261028200000_sale_gifts/migration.sql", "utf8"));
    await pg.exec(readFileSync("prisma/migrations/20261029190000_device_labels/migration.sql", "utf8"));
    assert.equal((await pg.query('SELECT "giftAllowed" FROM "InventoryItem" WHERE id=$1', [item])).rows[0].giftAllowed, false);

    const raw = (db: Database) => async (query: Prisma.Sql | TemplateStringsArray, ...values: unknown[]) => {
      const statement = Array.isArray(query) ? Prisma.sql(query as unknown as TemplateStringsArray, ...values) : query as Prisma.Sql;
      return db.query(statement.text, statement.values.map((value) => Prisma.Decimal.isDecimal(value) ? value.toString() : value));
    };
    const insert = async (db: Database, table: string, data: Row) => {
      const entries = Object.entries(data).filter(([, value]) => value !== undefined);
      return (await db.query(`INSERT INTO "${table}" (${entries.map(([key]) => `"${key}"`).join(",")}) VALUES (${entries.map((_, index) => `$${index + 1}`).join(",")}) RETURNING *`, entries.map(([, value]) => Prisma.Decimal.isDecimal(value) ? value.toString() : value))).rows[0];
    };
    const bridge = (db: Database) => ({
      inventoryMovement: { create: async ({ data }: { data: Row }) => insert(db, "InventoryMovement", data) },
      $queryRaw: async (query: Prisma.Sql | TemplateStringsArray, ...values: unknown[]) => (await raw(db)(query, ...values)).rows,
      $executeRaw: async (query: Prisma.Sql | TemplateStringsArray, ...values: unknown[]) => (await raw(db)(query, ...values)).affectedRows ?? 0,
      supplier: { findFirst: async () => ({ id: supplier, name: "Supplier" }) },
      inventoryItem: {
        findFirst: async ({ where }: { where: { id?: string | { not: string }; shopId?: string; barcode?: string; deviceIdentifier?: string } }) => {
          const params: unknown[] = [where.shopId ?? shop];
          const clauses = ['"shopId"=$1', '"deletedAt" IS NULL'];
          for (const key of ["id", "barcode", "deviceIdentifier"] as const) {
            const value = where[key]; if (value === undefined) continue;
            params.push(typeof value === "object" ? value.not : value);
            clauses.push(`"${key}" ${typeof value === "object" ? "<>" : "="} $${params.length}`);
          }
          return (await db.query(`SELECT * FROM "InventoryItem" WHERE ${clauses.join(" AND ")}`, params)).rows[0];
        },
        create: async ({ data }: { data: Row }) => {
          const entries = Object.entries(data).filter(([, value]) => value !== undefined);
          return (await db.query(`INSERT INTO "InventoryItem" (${entries.map(([key]) => `"${key}"`).join(",")}) VALUES (${entries.map((_, index) => `$${index + 1}`).join(",")}) RETURNING *`, entries.map(([, value]) => Prisma.Decimal.isDecimal(value) ? value.toString() : value))).rows[0];
        },
        update: async ({ where, data }: { where: { id: string }; data: Row }) => {
          const values: unknown[] = [];
          const setters = Object.entries(data).map(([key, value]) => {
            const increment = value && typeof value === "object" && "increment" in value ? (value as { increment: number }).increment : null;
            values.push(increment === null ? value : increment);
            return `"${key}"=${increment === null ? "" : `"${key}"+`}$${values.length}`;
          });
          values.push(where.id, shop);
          return (await db.query(`UPDATE "InventoryItem" SET ${setters.join(",")} WHERE id=$${values.length - 1} AND "shopId"=$${values.length} RETURNING *`, values)).rows[0];
        },
      },
    });
    prisma.$queryRaw = bridge(pg).$queryRaw as typeof prisma.$queryRaw;
    prisma.inventoryItem.count = (async () => 1) as typeof prisma.inventoryItem.count;
    prisma.supplier.findFirst = (async () => ({ id: supplier, name: "Supplier" })) as unknown as typeof prisma.supplier.findFirst;
    prisma.$transaction = (async (run: (tx: unknown) => Promise<unknown>) => pg.transaction((db) => run(bridge(db)))) as typeof prisma.$transaction;

    async function draft(lines: PurchaseDraftLineInput[]) {
      return saveDraft(shop, user, "SAR", { supplierId: supplier, invoiceDate: "2026-10-28", lines });
    }
    async function post(id: string) {
      // No stock receipt or payment is needed to test approval of product policy.
      return postPurchaseInvoice(shop, user, id, `gift-test-${id}`, { receiptMode: "PARTIAL", initialReceipt: [] });
    }

    // Direct policy changes preserve inventory, pricing and all other metadata.
    const before = (await pg.query('SELECT * FROM "InventoryItem" WHERE id=$1', [item])).rows[0];
    const movementCount = (await pg.query('SELECT count(*)::int AS n FROM "InventoryMovement"')).rows[0].n;
    await updateInventoryGiftPolicy(shop, item, true);
    const after = (await pg.query('SELECT * FROM "InventoryItem" WHERE id=$1', [item])).rows[0];
    assert.equal(after.giftAllowed, true);
    for (const key of Object.keys(before)) if (!["giftAllowed", "version", "updatedAt"].includes(key)) assert.deepEqual(after[key], before[key], `gift policy must preserve ${key}`);
    await updateInventoryGiftPolicy(shop, item, false);
    assert.equal((await pg.query('SELECT "giftAllowed" FROM "InventoryItem" WHERE id=$1', [item])).rows[0].giftAllowed, false);
    await assert.rejects(() => updateInventoryGiftPolicy("00000000-0000-4000-8000-000000000099", item, true), /غير موجود/);
    await assert.rejects(() => updateInventoryGiftPolicy(shop, item, "false" as unknown as boolean), /غير صالح/);
    await pg.query('UPDATE "InventoryItem" SET "deletedAt"=NOW() WHERE id=$1', [item]);
    await assert.rejects(() => updateInventoryGiftPolicy(shop, item, true), /غير موجود/);
    await pg.query('UPDATE "InventoryItem" SET "deletedAt"=NULL WHERE id=$1', [item]);
    assert.equal((await pg.query('SELECT count(*)::int AS n FROM "InventoryMovement"')).rows[0].n, movementCount);
    console.log("PASS direct gift policy: allow/revoke, unchanged prices/quantity/metadata, no movements, tenant/deleted-item boundaries, strict booleans.");
    const existing = { inventoryItemId: item, quantity: 1, unitCost: "100" };
    const allowed = await draft([{ ...existing, giftAllowed: true }]);
    assert.equal((await pg.query('SELECT "giftAllowed" FROM "PurchaseItem" WHERE "purchaseInvoiceId"=$1', [allowed.id])).rows[0].giftAllowed, true);
    assert.equal((await pg.query('SELECT "giftAllowed" FROM "InventoryItem" WHERE id=$1', [item])).rows[0].giftAllowed, false, "saving a draft must not change eligibility");
    await post(allowed.id);
    assert.equal((await pg.query('SELECT "giftAllowed" FROM "InventoryItem" WHERE id=$1', [item])).rows[0].giftAllowed, true);
    assert.equal((await post(allowed.id)).alreadyPosted, true);

    const omitted = await draft([existing]);
    await post(omitted.id);
    assert.equal((await pg.query('SELECT "giftAllowed" FROM "InventoryItem" WHERE id=$1', [item])).rows[0].giftAllowed, true, "omitted choice preserves current policy");
    const denied = await draft([{ ...existing, giftAllowed: false }]);
    await post(denied.id);
    assert.equal((await pg.query('SELECT "giftAllowed" FROM "InventoryItem" WHERE id=$1', [item])).rows[0].giftAllowed, false);
    const newGift = await draft([{ newItemName: "Gift product", quantity: 1, unitCost: "10", giftAllowed: true }]);
    await post(newGift.id);
    assert.equal((await pg.query('SELECT "giftAllowed" FROM "InventoryItem" WHERE name=$1', ["Gift product"])).rows[0].giftAllowed, true);
    const newDefault = await draft([{ newItemName: "Default product", quantity: 1, unitCost: "10" }]);
    await post(newDefault.id);
    assert.equal((await pg.query('SELECT "giftAllowed" FROM "InventoryItem" WHERE name=$1', ["Default product"])).rows[0].giftAllowed, false);
    const ordinaryPurchase = (await pg.query('SELECT * FROM "InventoryItem" WHERE name=$1', ["Default product"])).rows[0];
    assert.equal(ordinaryPurchase.isDevice, false);
    assert.match(String(ordinaryPurchase.barcode), /^20\d{10}$/);
    const conflict = await draft([{ ...existing, giftAllowed: true }, { ...existing, giftAllowed: false }]);
    await assert.rejects(() => post(conflict.id), /متعارض/);
    assert.equal((await pg.query('SELECT "giftAllowed" FROM "InventoryItem" WHERE id=$1', [item])).rows[0].giftAllowed, false);
    assert.equal((await pg.query('SELECT status FROM "PurchaseInvoice" WHERE id=$1', [conflict.id])).rows[0].status, "DRAFT");
    const saleId = "00000000-0000-4000-8000-000000000005";
    await pg.query('INSERT INTO "Sale" (id,"shopId",subtotal,total) VALUES ($1,$2,0,0)', [saleId, shop]);
    await assert.rejects(() => pg.query('INSERT INTO "SaleItem" ("shopId","saleId",description,quantity,"unitPriceSnapshot","lineTotal","isGift") VALUES ($1,$2,$3,1,10,10,TRUE)', [shop, saleId, "Invalid gift"]), /gift_zero_amounts/);
    await pg.query('INSERT INTO "SaleItem" ("shopId","saleId",description,quantity,"unitPriceSnapshot","lineTotal","isGift") VALUES ($1,$2,$3,1,0,0,TRUE)', [shop, saleId, "Gift"]);
    const deviceDetails = normalizeDeviceDetails({ isDevice: true, deviceModel: "iPhone 17 Pro Max", deviceCondition: "USED", batteryHealth: 87, storageCapacity: "256 gb", deviceIdentifier: "123456789012345" });
    const deviceDraft = await draft([{ newItemName: "Phone 1", quantity: 1, unitCost: "100", salePrice: "120", deviceDetails }]);
    const snapshot = (await pg.query('SELECT "deviceDetails" FROM "PurchaseItem" WHERE "purchaseInvoiceId"=$1', [deviceDraft.id])).rows[0].deviceDetails as Record<string, unknown>;
    assert.equal(snapshot.batteryHealth, 87);
    await post(deviceDraft.id);
    const phone = (await pg.query('SELECT * FROM "InventoryItem" WHERE name=$1', ["Phone 1"])).rows[0];
    assert.equal(phone.isDevice, true); assert.equal(phone.quantity, 0);
    assert.equal(phone.storageCapacity, "256 GB"); assert.match(String(phone.barcode), /^20\d{10}$/);
    const label = makeDeviceLabel({ ...normalizeDeviceDetails(phone), barcode: String(phone.barcode), unitPrice: { toString: () => "120" } }, "Test Shop", "SAR");
    assert.equal(label.batteryHealth, 87); assert.equal(label.condition, "مستعمل");
    assert.ok(label.barcodeDataUrl.startsWith("data:image/svg+xml;base64,"));
    assert.ok(!JSON.stringify(label).includes("123456789012345"), "private IMEI must not appear in printable label data");
    await assert.rejects(() => draft([{ newItemName: "Duplicate units", quantity: 2, unitCost: "100", deviceDetails }]), /كمية واحدة/);
    const duplicateSerial = await draft([{ newItemName: "Duplicate serial", quantity: 1, unitCost: "100", deviceDetails }]);
    await assert.rejects(() => post(duplicateSerial.id), /IMEI \/ Serial/);
    const duplicateBarcode = await draft([{ newItemName: "Duplicate barcode", newItemBarcode: String(phone.barcode), quantity: 1, unitCost: "100", deviceDetails: { ...deviceDetails, deviceIdentifier: null } }]);
    await assert.rejects(() => post(duplicateBarcode.id), /الباركود/);
    await assert.rejects(() => pg.query('UPDATE "InventoryItem" SET quantity=2 WHERE id=$1', [phone.id]), /device_metadata/);
    await assert.rejects(() => pg.query('UPDATE "InventoryItem" SET "batteryHealth"=101 WHERE id=$1', [phone.id]), /device_metadata/);
    await assert.rejects(() => pg.query('INSERT INTO "InventoryItem" ("shopId",name,"unitPrice","isDevice","deviceModel","deviceCondition","storageCapacity",barcode) VALUES ($1,$2,120,TRUE,$3,$4,$5,$6)', [shop, "Duplicate DB", "Phone", "NEW", "256 GB", phone.barcode]), /device_barcode/);
    const receivedDraft = await draft([{ newItemName: "Received phone", newItemBarcode: "PHONE-00042", quantity: 1, unitCost: "100", salePrice: "120", deviceDetails: { ...deviceDetails, deviceIdentifier: "123456789012346" } }]);
    await postPurchaseInvoice(shop, user, receivedDraft.id, `receive-${receivedDraft.id}`, { receiptMode: "FULL" });
    const received = (await pg.query('SELECT * FROM "InventoryItem" WHERE name=$1', ["Received phone"])).rows[0];
    assert.equal(received.quantity, 1); assert.equal(String(received.unitCost), "100");
    const match = await lookupInventoryByIdentifier(shop, "PHONE-00042");
    assert.equal(match.item?.id, received.id); assert.equal(match.item?.isDevice, true);
    const repeatedDevice = await draft([{ inventoryItemId: String(received.id), quantity: 1, unitCost: "100" }, { inventoryItemId: String(received.id), quantity: 1, unitCost: "100" }]);
    await assert.rejects(() => post(repeatedDevice.id), /كمية واحدة/);
    const extraReceipt = await draft([{ inventoryItemId: String(received.id), quantity: 1, unitCost: "100" }]);
    await assert.rejects(() => postPurchaseInvoice(shop, user, extraReceipt.id, `receive-${extraReceipt.id}`, { receiptMode: "FULL" }), /كمية واحدة/);
    assert.equal((await pg.query('SELECT quantity FROM "InventoryItem" WHERE id=$1', [received.id])).rows[0].quantity, 1);
    assert.equal((await pg.query('SELECT status FROM "PurchaseInvoice" WHERE id=$1', [extraReceipt.id])).rows[0].status, "DRAFT");
    const direct = await createInventoryItem(shop, user, { name: "Direct device", unitPrice: "120", unitCost: "100", quantity: "1", deviceDetails: { ...deviceDetails, deviceIdentifier: null } });
    assert.equal(direct.quantity, 1); assert.equal(direct.isDevice, true);
    await assert.rejects(() => addStock(shop, direct.id, user, { quantity: "1" }), /كمية واحدة/);
    await assert.rejects(() => adjustStock(shop, direct.id, user, { newQuantity: "2" }), /كمية واحدة/);
    await adjustStock(shop, direct.id, user, { newQuantity: "0" });
    assert.equal((await addStock(shop, direct.id, user, { quantity: "1" })).quantity, 1);
    const regular = await createInventoryItem(shop, user, { name: "Regular screen", unitPrice: "25", unitCost: "10", quantity: "12" });
    assert.equal(regular.isDevice, false); assert.equal(regular.quantity, 12);
    assert.match(String(regular.barcode), /^20\d{10}$/);
    const legacyBefore = (await pg.query('SELECT * FROM "InventoryItem" WHERE id=$1', [item])).rows[0];
    const movementsBeforeLabel = (await pg.query('SELECT count(*)::int AS n FROM "InventoryMovement"')).rows[0].n;
    assert.equal(await ensureInventoryLabelBarcode("00000000-0000-4000-8000-000000000099", item), null);
    const legacyBarcode = await ensureInventoryLabelBarcode(shop, item);
    assert.match(legacyBarcode!, /^20\d{10}$/);
    const legacyAfter = (await pg.query('SELECT * FROM "InventoryItem" WHERE id=$1', [item])).rows[0];
    for (const key of Object.keys(legacyBefore)) if (!["barcode", "version", "updatedAt"].includes(key)) assert.deepEqual(legacyAfter[key], legacyBefore[key], `label must preserve ${key}`);
    assert.equal(await ensureInventoryLabelBarcode(shop, item), legacyBarcode);
    assert.deepEqual((await pg.query('SELECT * FROM "InventoryItem" WHERE id=$1', [item])).rows[0], legacyAfter, "repeated label does not rewrite identity");
    await pg.query('UPDATE "InventoryItem" SET "deletedAt"=NOW() WHERE id=$1', [item]);
    assert.equal(await ensureInventoryLabelBarcode(shop, item), null);
    assert.equal((await pg.query('SELECT count(*)::int AS n FROM "InventoryMovement"')).rows[0].n, movementsBeforeLabel);
    console.log("PASS all-inventory labels: multi-unit manual item, purchase item barcode, legacy backfill/idempotency, tenant/deleted boundaries, unchanged prices/stock/device type and no movements.");
    console.log("PASS device PostgreSQL: additive migration, persisted purchase metadata, approval, automatic barcode, printable data, private serial exclusion, duplicate serial/barcode and quantity/battery constraints.");
    console.log("PASS isolated PostgreSQL: gift migration, existing-product default, persisted draft, approval, replay, omitted setting, revocation, new products, conflicting settings with rollback, and gift zero-value constraint.");
  } finally {
    prisma.$transaction = original.transaction; prisma.$queryRaw = original.queryRaw;
    prisma.inventoryItem.count = original.count; prisma.supplier.findFirst = original.supplier;
    await pg.close(); await prisma.$disconnect(); rmSync(temporary, { recursive: true, force: true });
  }
}
void main();
