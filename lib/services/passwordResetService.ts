import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
const MAX_USER_REQUESTS_PER_HOUR = 3;
const MAX_FINGERPRINT_REQUESTS_PER_HOUR = 10;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export const passwordResetService = {
  async requestReset(email: string, requestFingerprint: string | null) {
    const normalizedEmail = email.toLowerCase().trim();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    if (requestFingerprint) {
      const fingerprintRequests = await prisma.passwordResetToken.count({
        where: { requestFingerprint, createdAt: { gte: oneHourAgo } },
      });
      if (fingerprintRequests >= MAX_FINGERPRINT_REQUESTS_PER_HOUR) return;
    }

    const user = await prisma.user.findFirst({
      where: { email: normalizedEmail, deletedAt: null },
      select: { id: true, email: true, name: true },
    });

    // Never reveal whether an email is registered.
    if (!user) return;

    const recentRequests = await prisma.passwordResetToken.count({
      where: { userId: user.id, createdAt: { gte: oneHourAgo } },
    });
    if (recentRequests >= MAX_USER_REQUESTS_PER_HOUR) return;

    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    const resetToken = await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      return tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          requestFingerprint,
          expiresAt,
        },
      });
    });

    try {
      await sendPasswordResetEmail({ email: user.email, name: user.name, token: rawToken });
    } catch (error) {
      await prisma.passwordResetToken.delete({ where: { id: resetToken.id } }).catch(() => undefined);
      throw error;
    }
  },

  async isTokenValid(rawToken: string) {
    if (!rawToken || rawToken.length > 200) return false;
    const tokenHash = hashToken(rawToken);
    const token = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { usedAt: true, expiresAt: true, user: { select: { deletedAt: true } } },
    });
    return Boolean(token && !token.usedAt && token.expiresAt > new Date() && !token.user.deletedAt);
  },

  async resetPassword(rawToken: string, newPassword: string) {
    const tokenHash = hashToken(rawToken);
    const token = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, usedAt: true, expiresAt: true },
    });

    if (!token || token.usedAt || token.expiresAt <= new Date()) {
      throw new Error("رابط الاستعادة غير صالح أو انتهت مدته.");
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: token.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) throw new Error("رابط الاستعادة تم استخدامه بالفعل.");

      await tx.user.update({
        where: { id: token.userId, deletedAt: null },
        data: { passwordHash, version: { increment: 1 } },
      });

      await tx.passwordResetToken.updateMany({
        where: { userId: token.userId, usedAt: null },
        data: { usedAt: new Date() },
      });
    });
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: { passwordHash: true },
    });
    if (!user?.passwordHash || !(await verifyPassword(currentPassword, user.passwordHash))) {
      throw new Error("كلمة المرور الحالية غير صحيحة.");
    }
    if (await verifyPassword(newPassword, user.passwordHash)) {
      throw new Error("كلمة المرور الجديدة يجب أن تختلف عن الحالية.");
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, version: { increment: 1 } },
    });
  },
};
