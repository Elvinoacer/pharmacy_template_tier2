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
  await prismaUnscoped.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret, twoFactorEnabled: false },
    });
    await tx.mfaRecoveryCode.deleteMany({ where: { userId } });
    for (const code of codes) {
      await tx.mfaRecoveryCode.create({
        data: { userId, codeHash: await hashPassword(code) },
      });
    }
  });
  return { secret, otpauth: otpauthUrl(email, secret), recoveryCodes: codes };
}

export async function confirmMfa(userId: string, code: string): Promise<boolean> {
  const user = await prismaUnscoped.user.findUnique({ where: { id: userId } });
  if (!user?.twoFactorSecret) return false;
  if (!verifyTotp(user.twoFactorSecret, code)) return false;
  await prismaUnscoped.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: true, mfaEnrolledAt: new Date(), mfaEnforced: user.platformAdmin },
  });
  return true;
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
      await prismaUnscoped.mfaRecoveryCode.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      });
      await prismaUnscoped.user.update({ where: { id: userId }, data: { lastReauthAt: new Date() } });
      return true;
    }
  }
  return false;
}

export function mfaRequired(user: { platformAdmin?: boolean; twoFactorEnabled?: boolean; mfaEnforced?: boolean }): boolean {
  return Boolean(user.platformAdmin || user.mfaEnforced);
}
