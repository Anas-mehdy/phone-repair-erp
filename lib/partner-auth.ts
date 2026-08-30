import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const PARTNER_COOKIE_NAME = "massar_partner_session";
const JWT_SECRET = new TextEncoder().encode(
  process.env.PARTNER_AUTH_SECRET ||
    process.env.AUTH_SECRET ||
    "phone-repair-erp-secure-jwt-secret-key-2026-xyz",
);

export interface PartnerSessionPayload {
  kind: "partner";
  accountId: string;
  partnerId: string;
  email: string;
  partnerName: string;
  partnerCode: string;
  sessionVersion: number;
}

interface PartnerSessionRow {
  accountId: string;
  partnerId: string;
  email: string;
  version: number;
  accountDeletedAt: Date | null;
  partnerDeletedAt: Date | null;
  partnerStatus: "ACTIVE" | "SUSPENDED";
  partnerName: string;
  partnerCode: string;
}

async function createPartnerSessionToken(payload: PartnerSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

async function verifyPartnerSessionToken(token: string): Promise<PartnerSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.kind !== "partner") return null;
    return payload as unknown as PartnerSessionPayload;
  } catch {
    return null;
  }
}

export async function setPartnerSessionCookie(payload: PartnerSessionPayload) {
  const token = await createPartnerSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(PARTNER_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/partners",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearPartnerSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(PARTNER_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/partners",
    maxAge: 0,
  });
}

export async function getPartnerSession(): Promise<PartnerSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PARTNER_COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenPayload = await verifyPartnerSessionToken(token);
  if (!tokenPayload?.accountId || !tokenPayload.partnerId) return null;

  const rows = await prisma.$queryRaw<PartnerSessionRow[]>`
    SELECT
      a."id" AS "accountId",
      a."partnerId" AS "partnerId",
      a."email" AS "email",
      a."version" AS "version",
      a."deletedAt" AS "accountDeletedAt",
      p."deletedAt" AS "partnerDeletedAt",
      p."status"::text AS "partnerStatus",
      p."name" AS "partnerName",
      p."code" AS "partnerCode"
    FROM "PartnerPortalAccount" a
    JOIN "Partner" p ON p."id" = a."partnerId"
    WHERE a."id" = ${tokenPayload.accountId}::uuid
      AND a."partnerId" = ${tokenPayload.partnerId}::uuid
    LIMIT 1
  `;

  const row = rows[0];
  if (
    !row ||
    row.accountDeletedAt !== null ||
    row.partnerDeletedAt !== null ||
    row.partnerStatus !== "ACTIVE" ||
    row.version !== (tokenPayload.sessionVersion ?? 1)
  ) {
    return null;
  }

  return {
    kind: "partner",
    accountId: row.accountId,
    partnerId: row.partnerId,
    email: row.email,
    partnerName: row.partnerName,
    partnerCode: row.partnerCode,
    sessionVersion: row.version,
  };
}

export async function requirePartnerSession(): Promise<PartnerSessionPayload> {
  const session = await getPartnerSession();
  if (!session) redirect("/partners/login");
  return session;
}
