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
import { saveDraft, postPurchaseInvoice, type PurchaseDraftLineInput } from "../lib/services/purchaseReceivingService";

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
    const baseline = readFileSync("prisma/schema.prisma", "utf8").replace(/^\s+giftAllowed\s+.*\n/gm, "").replace(/^\s+isGift\s+.*\n/gm, "");
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
    assert.equal((await pg.query('SELECT "giftAllowed" FROM "InventoryItem" WHERE id=$1', [item])).rows[0].giftAllowed, false);

    const raw = (db: Database) => async (query: Prisma.Sql | TemplateStringsArray, ...values: unknown[]) => {
      const statement = Array.isArray(query) ? Prisma.sql(query as unknown as TemplateStringsArray, ...values) : query as Prisma.Sql;
      return db.query(statement.text, statement.values.map((value) => Prisma.Decimal.isDecimal(value) ? value.toString() : value));
    };
    const bridge = (db: Database) => ({
      $queryRaw: async (query: Prisma.Sql | TemplateStringsArray, ...values: unknown[]) => (await raw(db)(query, ...values)).rows,
      $executeRaw: async (query: Prisma.Sql | TemplateStringsArray, ...values: unknown[]) => (await raw(db)(query, ...values)).affectedRows ?? 0,
      supplier: { findFirst: async () => ({ id: supplier, name: "Supplier" }) },
      inventoryItem: {
        findFirst: async ({ where }: { where: { id: string } }) => (await db.query('SELECT * FROM "InventoryItem" WHERE id=$1 AND "shopId"=$2', [where.id, shop])).rows[0],
        create: async ({ data }: { data: Row }) => {
          const entries = Object.entries(data).filter(([, value]) => value !== undefined);
          return (await db.query(`INSERT INTO "InventoryItem" (${entries.map(([key]) => `"${key}"`).join(",")}) VALUES (${entries.map((_, index) => `$${index + 1}`).join(",")}) RETURNING *`, entries.map(([, value]) => Prisma.Decimal.isDecimal(value) ? value.toString() : value))).rows[0];
        },
        update: async ({ where, data }: { where: { id: string }; data: { giftAllowed: boolean } }) => {
          return (await db.query('UPDATE "InventoryItem" SET "giftAllowed"=$1,version=version+1 WHERE id=$2 AND "shopId"=$3 RETURNING *', [data.giftAllowed, where.id, shop])).rows[0];
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
    const conflict = await draft([{ ...existing, giftAllowed: true }, { ...existing, giftAllowed: false }]);
    await assert.rejects(() => post(conflict.id), /متعارض/);
    assert.equal((await pg.query('SELECT "giftAllowed" FROM "InventoryItem" WHERE id=$1', [item])).rows[0].giftAllowed, false);
    assert.equal((await pg.query('SELECT status FROM "PurchaseInvoice" WHERE id=$1', [conflict.id])).rows[0].status, "DRAFT");
    const saleId = "00000000-0000-4000-8000-000000000005";
    await pg.query('INSERT INTO "Sale" (id,"shopId",subtotal,total) VALUES ($1,$2,0,0)', [saleId, shop]);
    await assert.rejects(() => pg.query('INSERT INTO "SaleItem" ("shopId","saleId",description,quantity,"unitPriceSnapshot","lineTotal","isGift") VALUES ($1,$2,$3,1,10,10,TRUE)', [shop, saleId, "Invalid gift"]), /gift_zero_amounts/);
    await pg.query('INSERT INTO "SaleItem" ("shopId","saleId",description,quantity,"unitPriceSnapshot","lineTotal","isGift") VALUES ($1,$2,$3,1,0,0,TRUE)', [shop, saleId, "Gift"]);
    console.log("PASS isolated PostgreSQL: gift migration, existing-product default, persisted draft, approval, replay, omitted setting, revocation, new products, conflicting settings with rollback, and gift zero-value constraint.");
  } finally {
    prisma.$transaction = original.transaction; prisma.$queryRaw = original.queryRaw;
    prisma.inventoryItem.count = original.count; prisma.supplier.findFirst = original.supplier;
    await pg.close(); await prisma.$disconnect(); rmSync(temporary, { recursive: true, force: true });
  }
}
void main();
