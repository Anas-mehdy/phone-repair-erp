import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  reconcileStocktake,
  stocktakeScopes,
  type StocktakeScope,
} from "@/lib/stocktake";

type Tx = Prisma.TransactionClient;
export type StocktakeActor = { shopId: string; userId: string };
type Session = {
  id: string;
  title: string;
  scope: StocktakeScope;
  status: string;
  currency: string;
  shopNameSnapshot: string;
  startedAt: Date;
  closedAt: Date | null;
};
type Device = {
  id: string;
  barcode: string | null;
  name: string;
  deviceModel: string | null;
  deviceCondition: string | null;
  unitCost: string | null;
  unitPrice: string | null;
  quantity: number;
  version: number;
  isDevice: boolean;
  deletedAt: Date | null;
};
type Line = {
  id: string;
  inventoryItemId: string;
  barcodeSnapshot: string;
  nameSnapshot: string;
  modelSnapshot: string | null;
  conditionSnapshot: string | null;
  unitCostSnapshot: string | null;
  unitPriceSnapshot: string | null;
  quantitySnapshot: number;
  versionSnapshot: number;
  countedAt: Date | null;
  countedVersion: number | null;
  countedBarcode: string | null;
  countedMovementIds: string[];
  closingQuantity: number | null;
  observedQuantity: number | null;
  result: string | null;
  reason: string | null;
};
export type StocktakeLineView = Omit<Line, "countedAt"> & {
  countedAt: string | null;
};
export type StocktakeView = Omit<Session, "startedAt" | "closedAt"> & {
  startedAt: string;
  closedAt: string | null;
  lines: StocktakeLineView[];
  issues: { id: string; barcode: string; result: string; createdAt: string }[];
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validId(id: string) {
  if (!uuid.test(id)) throw new Error("معرف الجرد غير صالح.");
}
// Re-check native membership in the same transaction as every read/write.
// No owner/admin override and no trust in an old browser session's role.
async function guard(tx: Tx, actor: StocktakeActor) {
  validId(actor.shopId);
  validId(actor.userId);
  const rows = await tx.$queryRaw<
    { id: string }[]
  >`SELECT m."id" FROM "Membership" m JOIN "User" u ON u."id"=m."userId" JOIN "Shop" s ON s."id"=m."shopId"
    WHERE m."shopId"=${actor.shopId}::uuid AND m."userId"=${actor.userId}::uuid AND m."role"::text='ACCOUNTANT' AND m."status"::text='ACTIVE' AND m."deletedAt" IS NULL AND u."deletedAt" IS NULL AND s."deletedAt" IS NULL FOR SHARE OF m, u, s`;
  if (!rows.length)
    throw new Error("الجرد متاح للمحاسبين النشطين في هذا المتجر فقط.");
}
async function transaction<T>(
  actor: StocktakeActor,
  run: (tx: Tx) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          await guard(tx, actor);
          return run(tx);
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: 30000,
        },
      );
    } catch (error) {
      const e = error as { code?: string; meta?: { code?: string } };
      if (
        attempt < 2 &&
        (e.code === "P2034" || e.code === "40001" || e.meta?.code === "40001")
      )
        continue;
      throw error;
    }
  }
}
async function session(tx: Tx, actor: StocktakeActor, id: string) {
  validId(id);
  const rows = await tx.$queryRaw<
    Session[]
  >`SELECT * FROM "StocktakeSession" WHERE "id"=${id}::uuid AND "shopId"=${actor.shopId}::uuid FOR UPDATE`;
  if (!rows[0]) throw new Error("جلسة الجرد غير موجودة في هذا المتجر.");
  return rows[0];
}
async function devices(tx: Tx, shopId: string) {
  return tx.$queryRaw<
    Device[]
  >`SELECT "id","barcode","name","deviceModel","deviceCondition","unitCost"::text,"quantity","version","isDevice","deletedAt", CASE WHEN "salePriceConfigured" THEN "unitPrice"::text ELSE NULL END AS "unitPrice" FROM "InventoryItem" WHERE "shopId"=${shopId}::uuid AND "isDevice"=true ORDER BY "id" FOR SHARE`;
}
function inScope(item: Device, scope: StocktakeScope) {
  return (
    item.isDevice &&
    !item.deletedAt &&
    (scope === "ALL" || item.deviceCondition === scope)
  );
}
async function addLine(
  tx: Tx,
  actor: StocktakeActor,
  id: string,
  device: Device,
  baseline: boolean,
) {
  await tx.$executeRaw`INSERT INTO "StocktakeLine" ("shopId","sessionId","inventoryItemId","barcodeSnapshot","nameSnapshot","modelSnapshot","conditionSnapshot","unitCostSnapshot","unitPriceSnapshot","quantitySnapshot","versionSnapshot") VALUES
    (${actor.shopId}::uuid,${id}::uuid,${device.id}::uuid,${device.barcode ?? ""},${device.name},${device.deviceModel},${device.deviceCondition},${device.unitCost}::numeric,${device.unitPrice}::numeric,${baseline ? device.quantity : 0},${device.version}) ON CONFLICT ("sessionId","inventoryItemId") DO NOTHING`;
}
async function lines(tx: Tx, actor: StocktakeActor, id: string) {
  return tx.$queryRaw<
    Line[]
  >`SELECT "id","inventoryItemId","barcodeSnapshot","nameSnapshot","modelSnapshot","conditionSnapshot","unitCostSnapshot"::text,"unitPriceSnapshot"::text,"quantitySnapshot","versionSnapshot","countedAt","countedVersion","countedBarcode","countedMovementIds","closingQuantity","observedQuantity","result","reason" FROM "StocktakeLine" WHERE "shopId"=${actor.shopId}::uuid AND "sessionId"=${id}::uuid ORDER BY "nameSnapshot","id"`;
}
async function movements(tx: Tx, actor: StocktakeActor, id: string) {
  return tx.$queryRaw<
    { id: string; inventoryItemId: string; quantityChange: number }[]
  >`SELECT m."id",m."inventoryItemId",m."quantityChange" FROM "InventoryMovement" m JOIN "StocktakeLine" l ON l."inventoryItemId"=m."inventoryItemId" AND l."sessionId"=${id}::uuid AND l."shopId"=${actor.shopId}::uuid WHERE m."shopId"=${actor.shopId}::uuid AND m."deletedAt" IS NULL`;
}
async function preview(
  tx: Tx,
  actor: StocktakeActor,
  s: Session,
  all: Device[],
) {
  const ls = await lines(tx, actor, s.id);
  const known = new Set(ls.map((l) => l.inventoryItemId));
  for (const d of all.filter(
    (d) => !known.has(d.id) && inScope(d, s.scope) && d.quantity > 0,
  ))
    ls.push({
      id: `new:${d.id}`,
      inventoryItemId: d.id,
      barcodeSnapshot: d.barcode ?? "",
      nameSnapshot: d.name,
      modelSnapshot: d.deviceModel,
      conditionSnapshot: d.deviceCondition,
      unitCostSnapshot: d.unitCost,
      unitPriceSnapshot: d.unitPrice,
      quantitySnapshot: 0,
      versionSnapshot: d.version,
      countedAt: null,
      countedVersion: null,
      countedBarcode: null,
      countedMovementIds: [],
      closingQuantity: null,
      observedQuantity: null,
      result: null,
      reason: null,
    });
  const ms = await movements(tx, actor, s.id);
  const byId = new Map(all.map((d) => [d.id, d]));
  const byMovement = new Map<string, typeof ms>();
  for (const m of ms) {
    const list = byMovement.get(m.inventoryItemId) ?? [];
    list.push(m);
    byMovement.set(m.inventoryItemId, list);
  }
  return ls.map((line) => {
    const device = byId.get(line.inventoryItemId);
    const prior = new Set(line.countedMovementIds);
    const diff = (byMovement.get(line.inventoryItemId) ?? []).filter(
      (m) => !prior.has(m.id),
    );
    const result = reconcileStocktake({
      counted: Boolean(line.countedAt),
      quantitySnapshot: line.quantitySnapshot,
      versionSnapshot: line.versionSnapshot,
      countedVersion: line.countedVersion,
      countedBarcode: line.countedBarcode,
      current: device ? { ...device, valid: inScope(device, s.scope) } : null,
      movementChanges: diff.map((m) => m.quantityChange),
    });
    return { ...line, ...result, closingQuantity: device?.quantity ?? null };
  });
}
export async function listStocktakes(actor: StocktakeActor) {
  return transaction(actor, async (tx) => {
    const rows = await tx.$queryRaw<
      (Session & { total: number; counted: number })[]
    >`SELECT s.*, (SELECT count(*)::int FROM "StocktakeLine" l WHERE l."sessionId"=s."id") AS total, (SELECT count(*)::int FROM "StocktakeLine" l WHERE l."sessionId"=s."id" AND l."countedAt" IS NOT NULL) AS counted FROM "StocktakeSession" s WHERE s."shopId"=${actor.shopId}::uuid ORDER BY s."startedAt" DESC LIMIT 100`;
    return rows.map((s) => ({
      ...s,
      startedAt: s.startedAt.toISOString(),
      closedAt: s.closedAt?.toISOString() ?? null,
    }));
  });
}
export async function startStocktake(
  actor: StocktakeActor,
  title: string,
  scope: string,
) {
  title = title.trim();
  if (!title || title.length > 120 || !Object.hasOwn(stocktakeScopes, scope))
    throw new Error("أدخل عنوانًا لا يتجاوز 120 حرفًا ونطاق جرد صحيحًا.");
  return transaction(actor, async (tx) => {
    const [s] = await tx.$queryRaw<
      Session[]
    >`INSERT INTO "StocktakeSession" ("shopId","createdByUserId","title","scope","shopNameSnapshot","currency") SELECT "id",${actor.userId}::uuid,${title},${scope},"name",COALESCE("currency",'SAR') FROM "Shop" WHERE "id"=${actor.shopId}::uuid RETURNING *`;
    const all = await devices(tx, actor.shopId);
    for (const device of all.filter(
      (d) => inScope(d, scope as StocktakeScope) && d.quantity > 0,
    ))
      await addLine(tx, actor, s.id, device, true);
    return s.id;
  });
}
export async function scanStocktake(
  actor: StocktakeActor,
  id: string,
  barcode: string,
  recount = false,
) {
  barcode = barcode.trim();
  if (!barcode || barcode.length > 160 || /[\u0000-\u001f]/.test(barcode))
    throw new Error("امسح باركود صالحًا (حتى 160 حرفًا).");
  return transaction(actor, async (tx) => {
    const s = await session(tx, actor, id);
    if (s.status !== "OPEN")
      throw new Error("جلسة الجرد مغلقة؛ لا يمكن تعديلها.");
    const found = await tx.$queryRaw<
      Device[]
    >`SELECT "id","barcode","name","deviceModel","deviceCondition","unitCost"::text,"quantity","version","isDevice","deletedAt",CASE WHEN "salePriceConfigured" THEN "unitPrice"::text ELSE NULL END AS "unitPrice" FROM "InventoryItem" WHERE "shopId"=${actor.shopId}::uuid AND "barcode"=${barcode} AND "deletedAt" IS NULL FOR SHARE`;
    const candidates = found.filter((d) => d.isDevice);
    const device = candidates.length === 1 ? candidates[0] : undefined;
    let result = "UNKNOWN",
      message = "الباركود غير معروف كجهاز مستقل؛ راجعه في سجل المسح.";
    if (candidates.length > 1) {
      result = "AMBIGUOUS";
      message = "الباركود مرتبط بأكثر من جهاز؛ يلزم تصحيح البيانات.";
    } else if (device && !inScope(device, s.scope)) {
      result = "OUT_OF_SCOPE";
      message = "الجهاز خارج نطاق هذه الجلسة.";
    } else if (device) {
      await addLine(tx, actor, id, device, false);
      const [line] = await tx.$queryRaw<
        Line[]
      >`SELECT * FROM "StocktakeLine" WHERE "sessionId"=${id}::uuid AND "shopId"=${actor.shopId}::uuid AND "inventoryItemId"=${device.id}::uuid`;
      if (line.countedAt && !recount) {
        result = "DUPLICATE";
        message = "سبق جرد هذا الجهاز. فعّل إعادة المسح لتحديث التحقق.";
      } else {
        const ms = await tx.$queryRaw<
          { id: string }[]
        >`SELECT "id" FROM "InventoryMovement" WHERE "shopId"=${actor.shopId}::uuid AND "inventoryItemId"=${device.id}::uuid AND "deletedAt" IS NULL`;
        const ids = ms.map((m) => m.id);
        const movementArray = ids.length
          ? Prisma.sql`ARRAY[${Prisma.join(ids.map((m) => Prisma.sql`${m}::uuid`))}]::uuid[]`
          : Prisma.sql`'{}'::uuid[]`;
        await tx.$executeRaw`UPDATE "StocktakeLine" SET "countedAt"=clock_timestamp(),"countedByUserId"=${actor.userId}::uuid,"countedVersion"=${device.version},"countedBarcode"=${barcode},"countedMovementIds"=${movementArray} WHERE "id"=${line.id}::uuid AND "shopId"=${actor.shopId}::uuid`;
        result = line.countedAt ? "RECOUNTED" : "COUNTED";
        message =
          device.quantity === 1
            ? `تم جرد ${device.deviceModel || device.name}.`
            : "تم تسجيل الجهاز الموجود فعليًا؛ كميته بالنظام صفر ويحتاج مراجعة.";
      }
    }
    await tx.$executeRaw`INSERT INTO "StocktakeScan" ("shopId","sessionId","actorUserId","inventoryItemId","barcode","result") VALUES (${actor.shopId}::uuid,${id}::uuid,${actor.userId}::uuid,${device?.id ?? null}::uuid,${barcode},${result})`;
    return { result, message };
  });
}
export async function getStocktake(
  actor: StocktakeActor,
  id: string,
): Promise<StocktakeView> {
  return transaction(actor, async (tx) => {
    const s = await session(tx, actor, id);
    let ls: Line[];
    if (s.status === "CLOSED") ls = await lines(tx, actor, id);
    else {
      const all = await devices(tx, actor.shopId);
      // Preview new arrivals without mutating an open session on a GET.
      ls = await preview(tx, actor, s, all);
    }
    const issues = await tx.$queryRaw<
      { id: string; barcode: string; result: string; createdAt: Date }[]
    >`SELECT "id","barcode","result","createdAt" FROM "StocktakeScan" WHERE "shopId"=${actor.shopId}::uuid AND "sessionId"=${id}::uuid AND "result" IN ('UNKNOWN','OUT_OF_SCOPE','AMBIGUOUS') ORDER BY "createdAt" DESC LIMIT 500`;
    return {
      ...s,
      startedAt: s.startedAt.toISOString(),
      closedAt: s.closedAt?.toISOString() ?? null,
      lines: ls.map((l) => ({
        ...l,
        countedAt: l.countedAt?.toISOString() ?? null,
      })),
      issues: issues.map((i) => ({
        ...i,
        createdAt: i.createdAt.toISOString(),
      })),
    };
  });
}
export async function closeStocktake(actor: StocktakeActor, id: string) {
  return transaction(actor, async (tx) => {
    const s = await session(tx, actor, id);
    if (s.status === "CLOSED") return;
    const all = await devices(tx, actor.shopId);
    for (const device of all.filter(
      (d) => inScope(d, s.scope) && d.quantity > 0,
    ))
      await addLine(tx, actor, id, device, false);
    const ls = await preview(tx, actor, s, all);
    for (const line of ls)
      await tx.$executeRaw`UPDATE "StocktakeLine" SET "result"=${line.result},"reason"=${line.reason},"closingQuantity"=${line.closingQuantity},"observedQuantity"=${line.observedQuantity} WHERE "id"=${line.id}::uuid AND "shopId"=${actor.shopId}::uuid`;
    await tx.$executeRaw`UPDATE "StocktakeSession" SET "status"='CLOSED',"closedAt"=clock_timestamp(),"closedByUserId"=${actor.userId}::uuid WHERE "id"=${id}::uuid AND "shopId"=${actor.shopId}::uuid`;
  });
}
