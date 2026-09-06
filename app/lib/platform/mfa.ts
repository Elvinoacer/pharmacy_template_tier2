import "server-only";

import { randomBytes } from "crypto";
import { prismaUnscoped } from "@/app/lib/db";
import { hashPassword, verifyPassword } from "@/app/lib/auth";
import {
  generateTotpSecret,
  otpauthUrl,
  verifyTotp,
} from "@/app/lib/platform/totp";

export { generateTotpSecret, otpauthUrl, verifyTotp } from "@/app/lib/platform/totp";

export async function enrollMfa(userId: string, email: string) {
  const secret = generateTotpSecret();
  const codes = Array.from({ length: 8 }, () => randomBytes(5).toString("hex"));
  const hashes = await Promise.all(codes.map(code => hashPassword(code)));
  await prismaUnscoped.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({
      where: { id: userId, twoFactorEnabled: false },
      data: { twoFactorSecret: secret },
    });
    if (updated.count !== 1) throw new Error("Two-factor authentication is already enabled.");
    await tx.mfaRecoveryCode.deleteMany({ where: { userId } });
    await tx.mfaRecoveryCode.createMany({ data: hashes.map(codeHash => ({ userId, codeHash })) });
  }, { maxWait: 10_000, timeout: 15_000 });
  return { secret, otpauth: otpauthUrl(email, secret), recoveryCodes: codes };
}

export async function confirmMfa(userId: string, code: string): Promise<boolean> {
  const user = await prismaUnscoped.user.findUnique({ where: { id: userId } });
  if (!user?.twoFactorSecret || user.twoFactorEnabled) return false;
  if (!verifyTotp(user.twoFactorSecret, code)) return false;
  const confirmed = await prismaUnscoped.user.updateMany({
    where: { id: userId, twoFactorSecret: user.twoFactorSecret, twoFactorEnabled: false },
    data: {
      twoFactorEnabled: true,
      mfaEnrolledAt: new Date(),
      mfaEnforced: user.platformAdmin,
      lastReauthAt: new Date(),
    },
  });
  return confirmed.count === 1;
}

export async function verifyUserMfa(userId: string, code: string): Promise<boolean> {
  const user = await prismaUnscoped.user.findUnique({
    where: { id: userId },
    include: { mfaRecoveryCodes: { where: { usedAt: null } } },
  });
  if (!user?.twoFactorEnabled || !user.twoFactorSecret) return false;
  if (verifyTotp(user.twoFactorSecret, code)) {
    await prismaUnscoped.user.update({ where: { id: userId }, data: { lastReauthAt: new Date() } });
    return true;
  }
  for (const row of user.mfaRecoveryCodes) {
    if (await verifyPassword(code.trim().toLowerCase(), row.codeHash)) {
      const used = await prismaUnscoped.mfaRecoveryCode.updateMany({
        where: { id: row.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (used.count !== 1) return false;
      await prismaUnscoped.user.update({ where: { id: userId }, data: { lastReauthAt: new Date() } });
      return true;
    }
  }
  return false;
}

export function mfaRequired(user: { platformAdmin?: boolean; twoFactorEnabled?: boolean; mfaEnforced?: boolean }): boolean {
  return Boolean(user.platformAdmin || user.mfaEnforced);
}
