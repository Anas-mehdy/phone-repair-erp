// Isolated PostgreSQL integration: no live database URL is used.
// PGLITE_MODULE_PATH=/path/to/@electric-sql/pglite/dist/index.js npm run stocktakes:test
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  listStocktakes,
  startStocktake,
  scanStocktake,
  getStocktake,
  closeStocktake,
} from "../lib/services/stocktakeService";
import {
  exportStocktake,
  reportLines,
  sumMoney,
  money,
} from "../lib/stocktake-report";
import { hasRolePermission } from "../lib/auth/permissions";

type DB = {
  query: (
    sql: string,
    values?: unknown[],
  ) => Promise<{ rows: Record<string, unknown>[]; affectedRows?: number }>;
  exec: (sql: string) => Promise<unknown>;
  transaction: (run: (tx: DB) => Promise<unknown>) => Promise<unknown>;
  close: () => Promise<void>;
};
async function main() {
  const { PGlite } = await import(
    process.env.PGLITE_MODULE_PATH ?? "@electric-sql/pglite"
  );
  const pg: DB = await PGlite.create();
  const temporary = mkdtempSync(join(tmpdir(), "masar-stocktake-test-"));
  const original = prisma.$transaction;
  const id = (n: number) =>
    `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const shop = id(1),
    user = id(2),
    otherShop = id(3),
    owner = id(4),
    admin = id(5),
    otherUser = id(6);
  const actor = { shopId: shop, userId: user };
  try {
    // Build the pre-feature schema without relying on git history or an external DB.
    let before = readFileSync("prisma/schema.prisma", "utf8").replace(
      /^\s*ACCOUNTANT[^\n]*$/m,
      "",
    );
    before = before.slice(0, before.indexOf("model StocktakeSession"));
    before = before.replace(
      /^\s*\w+\s+Stocktake(?:Session|Line|Scan)\[\].*$/gm,
      "",
    );
    const schema = join(temporary, "schema.prisma");
    writeFileSync(schema, before);
    const sql = execFileSync(
      process.execPath,
      [
        "node_modules/prisma/build/index.js",
        "migrate",
        "diff",
        "--from-empty",
        "--to-schema-datamodel",
        schema,
        "--script",
      ],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          DATABASE_URL: "postgresql://unused:unused@127.0.0.1:1/unused",
        },
      },
    );
    await pg.exec(sql);
    // Match Supabase projects that automatically grant new public tables to API roles.
    await pg.exec(
      "CREATE ROLE anon; CREATE ROLE authenticated; ALTER DEFAULT PRIVILEGES GRANT ALL ON TABLES TO anon, authenticated;",
    );

    await pg.exec(
      readFileSync(
        "prisma/migrations/20261029210000_accountant_stocktakes/migration.sql",
        "utf8",
      ),
    );
    await pg.exec(`DO $$ DECLARE c record; BEGIN
      FOR c IN SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='id' AND data_type='uuid' LOOP EXECUTE format('ALTER TABLE %I ALTER COLUMN id SET DEFAULT gen_random_uuid()',c.table_name); END LOOP;
      FOR c IN SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='updatedAt' LOOP EXECUTE format('ALTER TABLE %I ALTER COLUMN "updatedAt" SET DEFAULT NOW()',c.table_name); END LOOP; END $$;`);
    for (const s of [shop, otherShop])
      await pg.query('INSERT INTO "Shop" (id,name) VALUES ($1,$2)', [
        s,
        "متجر الجرد",
      ]);
    for (const [u, s, role] of [
      [user, shop, "ACCOUNTANT"],
      [owner, shop, "OWNER"],
      [admin, shop, "ADMIN"],
      [otherUser, otherShop, "ACCOUNTANT"],
    ]) {
      await pg.query(
        'INSERT INTO "User" (id,email,name,"shopId") VALUES ($1,$2,$3,$4)',
        [u, `${u}@example.invalid`, role, s],
      );
      await pg.query(
        'INSERT INTO "Membership" ("shopId","userId",role) VALUES ($1,$2,$3)',
        [s, u, role],
      );
    }
    const raw =
      (db: DB) =>
      async (
        query: Prisma.Sql | TemplateStringsArray,
        ...values: unknown[]
      ) => {
        const q = Array.isArray(query)
          ? Prisma.sql(query as unknown as TemplateStringsArray, ...values)
          : (query as Prisma.Sql);
        return db.query(q.text, q.values);
      };
    prisma.$transaction = (async (run: (tx: unknown) => Promise<unknown>) =>
      pg.transaction((db) =>
        run({
          $queryRaw: async (
            q: Prisma.Sql | TemplateStringsArray,
            ...v: unknown[]
          ) => (await raw(db)(q, ...v)).rows,
          $executeRaw: async (
            q: Prisma.Sql | TemplateStringsArray,
            ...v: unknown[]
          ) => (await raw(db)(q, ...v)).affectedRows ?? 0,
        }),
      )) as typeof prisma.$transaction;
    async function device(
      n: number,
      barcode: string,
      quantity = 1,
      condition = "NEW",
      s = shop,
    ) {
      await pg.query(
        'INSERT INTO "InventoryItem" (id,"shopId",name,"deviceModel","isDevice","deviceCondition",barcode,"unitCost","unitPrice",quantity) VALUES ($1,$2,$3::text,$3::text,true,$4,$5,100.123456,150,$6)',
        [id(n), s, `Device ${n}`, condition, barcode, quantity],
      );
    }
    await device(10, "0001234567890123456789");
    await device(11, "MISSING");
    await device(12, "SOLD-BEFORE");
    await device(13, "SOLD-AFTER");
    await device(14, "ZERO", 0);
    await device(15, "USED", 1, "USED");
    await device(16, "OTHER", 1, "NEW", otherShop);
    await device(17, "CHANGED");
    await pg.query(
      'UPDATE "InventoryItem" SET "unitCost"=NULL,"salePriceConfigured"=false WHERE id=$1',
      [id(11)],
    );
    for (const role of ["OWNER", "ADMIN", "TECHNICIAN", "VIEWER"] as const)
      assert.equal(hasRolePermission(role, "inventory:stocktake"), false);
    assert.equal(hasRolePermission("ACCOUNTANT", "inventory:stocktake"), true);
    assert.equal(hasRolePermission("ACCOUNTANT", "inventory:adjust"), false);
    for (const u of [owner, admin])
      await assert.rejects(
        startStocktake({ shopId: shop, userId: u }, "Denied", "ALL"),
        /محاسبين/,
      );
    await assert.rejects(startStocktake(actor, "Invalid", "__proto__"));
    const session = await startStocktake(actor, "جرد تجريبي", "NEW");
    assert.equal((await getStocktake(actor, session)).lines.length, 5);
    await assert.rejects(
      getStocktake({ shopId: otherShop, userId: otherUser }, session),
      /غير موجودة/,
    );
    assert.equal(
      (await scanStocktake(actor, session, "0001234567890123456789")).result,
      "COUNTED",
    );
    assert.equal(
      (await scanStocktake(actor, session, "0001234567890123456789")).result,
      "DUPLICATE",
    );
    assert.equal(
      (await scanStocktake(actor, session, "USED")).result,
      "OUT_OF_SCOPE",
    );
    assert.equal(
      (await scanStocktake(actor, session, "OTHER")).result,
      "UNKNOWN",
    );
    assert.equal(
      (await scanStocktake(actor, session, "=cmd<bad>&")).result,
      "UNKNOWN",
    );
    assert.equal(
      (await scanStocktake(actor, session, "ZERO")).result,
      "COUNTED",
    );
    assert.equal(
      (await scanStocktake(actor, session, "CHANGED")).result,
      "COUNTED",
    );
    assert.equal(
      (await scanStocktake(actor, session, "SOLD-AFTER")).result,
      "COUNTED",
    );
    async function move(n: number, delta: number) {
      await pg.query(
        'UPDATE "InventoryItem" SET quantity=quantity+$2,version=version+1 WHERE id=$1',
        [id(n), delta],
      );
      // Deliberately old timestamp: classification must use movement IDs, not time.
      await pg.query(
        'INSERT INTO "InventoryMovement" ("shopId","inventoryItemId",type,"quantityChange","createdAt") VALUES ($1,$2,\'ADJUSTMENT\',$3,\'2000-01-01\')',
        [shop, id(n), delta],
      );
    }
    await move(12, -1);
    await move(13, -1);
    await pg.query(
      'UPDATE "InventoryItem" SET "unitPrice"=160,version=version+1 WHERE id=$1',
      [id(17)],
    );
    await device(18, "ARRIVED");
    let data = await getStocktake(actor, session);
    const by = (n: number) =>
      data.lines.find((l) => l.inventoryItemId === id(n))!;
    assert.equal(by(10).result, "COUNTED");
    assert.equal(by(11).result, "MISSING");
    assert.equal(by(12).result, "MOVED");
    assert.equal(by(13).result, "MOVED");
    assert.equal(by(14).result, "REVIEW");
    assert.equal(by(17).result, "REVIEW");
    assert.equal(by(18).result, "REVIEW");
    assert.equal(by(11).unitCostSnapshot, null);
    assert.equal(by(11).unitPriceSnapshot, null);
    assert.equal(by(10).unitCostSnapshot, "100.123456");
    assert.equal(
      (await scanStocktake(actor, session, "CHANGED", true)).result,
      "RECOUNTED",
    );
    assert.equal(
      (await scanStocktake(actor, session, "ARRIVED")).result,
      "COUNTED",
    );
    // Sales return after the scan is reconciled back into available stock.
    await move(13, 1);
    assert.equal(
      (await scanStocktake(actor, session, "SOLD-AFTER", true)).result,
      "RECOUNTED",
    );
    const anchored = await getStocktake(actor, session);
    assert.equal(
      anchored.lines.find((l) => l.inventoryItemId === id(13))
        ?.countedMovementIds.length,
      2,
    );
    const inventoryBefore = JSON.stringify(
      (await pg.query('SELECT * FROM "InventoryItem" ORDER BY id')).rows,
    );
    const movementsBefore = JSON.stringify(
      (await pg.query('SELECT * FROM "InventoryMovement" ORDER BY id')).rows,
    );
    await closeStocktake(actor, session);
    await closeStocktake(actor, session);
    data = await getStocktake(actor, session);
    assert.equal(data.status, "CLOSED");
    assert.equal(by(13).result, "COUNTED");
    assert.equal(by(17).result, "COUNTED");
    assert.equal(reportLines(data, "MISSING").length, 1);
    assert.equal(reportLines(data, "COUNTED").length, 5);
    assert.equal(
      JSON.stringify(
        (await pg.query('SELECT * FROM "InventoryItem" ORDER BY id')).rows,
      ),
      inventoryBefore,
      "stocktake must never change inventory",
    );
    assert.equal(
      JSON.stringify(
        (await pg.query('SELECT * FROM "InventoryMovement" ORDER BY id')).rows,
      ),
      movementsBefore,
      "stocktake must never create movements",
    );
    await assert.rejects(scanStocktake(actor, session, "MISSING"), /مغلقة/);
    await pg.query(
      'UPDATE "InventoryItem" SET quantity=0,version=version+1 WHERE id=$1',
      [id(10)],
    );
    assert.equal(
      (await getStocktake(actor, session)).lines.find(
        (l) => l.inventoryItemId === id(10),
      )?.result,
      "COUNTED",
      "closed results stay frozen",
    );
    assert.equal(
      sumMoney(["999999999999.999999", "0.000001"]),
      "1000000000000.000000",
    );
    assert.equal(money(sumMoney(["0.100000", "0.200000"])), "0.3");
    const xml = exportStocktake(data, "ALL");
    assert.match(xml, /<Data ss:Type="String">0001234567890123456789<\/Data>/);
    assert.match(xml, /=cmd&lt;bad&gt;&amp;/);
    assert.doesNotMatch(xml, /ss:Formula=/);
    assert.equal((await listStocktakes(actor)).length, 1);

    for (const role of ["anon", "authenticated"]) {
      const privilege = (
        await pg.query(
          `SELECT has_table_privilege($1, 'public."StocktakeSession"', 'SELECT') AS allowed`,
          [role],
        )
      ).rows[0];
      assert.equal(
        privilege.allowed,
        false,
        "explicit API grants must be revoked",
      );
    }
    // Membership revocation is checked afresh inside the service.
    await pg.query(
      'UPDATE "Membership" SET status=\'SUSPENDED\' WHERE "userId"=$1',
      [user],
    );
    await assert.rejects(getStocktake(actor, session), /محاسبين/);
    await assert.rejects(closeStocktake(actor, session), /محاسبين/);
    await pg.exec(
      "CREATE ROLE stocktake_untrusted; GRANT USAGE ON SCHEMA public TO stocktake_untrusted; SET ROLE stocktake_untrusted;",
    );
    await assert.rejects(
      pg.query('SELECT * FROM "StocktakeSession"'),
      /permission denied/,
    );
    await pg.exec(
      'RESET ROLE; GRANT SELECT ON "StocktakeSession" TO stocktake_untrusted; SET ROLE stocktake_untrusted;',
    );
    assert.equal(
      (await pg.query('SELECT * FROM "StocktakeSession"')).rows.length,
      0,
      "RLS denies even a client with SELECT grants",
    );
    await pg.exec("RESET ROLE;");
    console.log(
      "Stocktake integration passed: accountant isolation, tenant boundaries, scans, duplicates, movement reconciliation, frozen reports, exact barcode export, no stock mutation, RLS.",
    );
  } finally {
    prisma.$transaction = original;
    await pg.close();
    rmSync(temporary, { recursive: true, force: true });
    await prisma.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
