import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_VERSION = "v1";
const TOKEN_TTL_DAYS = 120;
const DAY_SECONDS = 24 * 60 * 60;

function secret() {
  const value = process.env.GROWTH_LIFECYCLE_UNSUBSCRIBE_SECRET?.trim();
  if (!value || value.length < 32) {
    throw new Error("GROWTH_LIFECYCLE_UNSUBSCRIBE_SECRET must be configured with at least 32 characters.");
  }
  return value;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createLifecycleUnsubscribeToken(shopId: string, now = new Date()) {
  const expiresAt = Math.floor(now.getTime() / 1000) + TOKEN_TTL_DAYS * DAY_SECONDS;
  const payload = `${TOKEN_VERSION}.${shopId}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyLifecycleUnsubscribeToken(token: string, now = new Date()) {
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== TOKEN_VERSION) return null;
  const [version, shopId, expiresRaw, signature] = parts;
  if (!/^[0-9a-f-]{36}$/i.test(shopId)) return null;
  const expiresAt = Number(expiresRaw);
  if (!Number.isInteger(expiresAt) || expiresAt <= Math.floor(now.getTime() / 1000)) return null;
  const payload = `${version}.${shopId}.${expiresRaw}`;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  return { shopId, expiresAt: new Date(expiresAt * 1000) };
}
