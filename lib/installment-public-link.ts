import { SignJWT, jwtVerify } from "jose";

function secret() {
  const value = process.env.INSTALLMENT_LINK_SECRET || process.env.AUTH_SECRET;
  if (!value) throw new Error("INSTALLMENT_LINK_SECRET أو AUTH_SECRET غير مضبوط.");
  return new TextEncoder().encode(value);
}

export async function createInstallmentPublicToken(planId: string, version: number) {
  return new SignJWT({ planId, version })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("installment-customer-portal")
    .setIssuedAt()
    .setExpirationTime("5y")
    .sign(secret());
}

export async function verifyInstallmentPublicToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret(), {
      audience: "installment-customer-portal",
    });
    if (typeof payload.planId !== "string" || typeof payload.version !== "number") return null;
    return { planId: payload.planId, version: payload.version };
  } catch {
    return null;
  }
}
