import "server-only";

import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/app/lib/db";
import type { SessionUser, UserRole } from "@/app/lib/types";
import { STAFF_ROLES } from "@/app/lib/types";
import { UserRole as PrismaUserRole } from "@/app/generated/prisma/client";
import { addTimelineEvent, writeAuditLog } from "@/app/lib/timeline";

export { addTimelineEvent, writeAuditLog };

const SESSION_COOKIE = "aether_session";
const SESSION_DAYS = 14;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createSession(
  userId: string,
  meta?: { ip?: string; userAgent?: string },
): Promise<string> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      ipAddress: meta?.ip ?? null,
      userAgent: meta?.userAgent ?? null,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });

  return token;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionUserByToken(token: string): Promise<SessionUser | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        include: { profile: true },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }
  if (session.user.status !== "active") return null;

  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role as UserRole,
    fullName: session.user.profile?.fullName ?? null,
    customerId: session.user.profile?.id ?? null,
  };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  return getSessionUserByToken(token);
}

export function isStaff(role: UserRole): boolean {
  return STAFF_ROLES.includes(role);
}

export function requireStaff(user: SessionUser | null): SessionUser {
  if (!user || !isStaff(user.role)) {
    throw new AuthError("Staff access required", 403);
  }
  return user;
}

export function requireManager(user: SessionUser | null): SessionUser {
  if (!user || user.role !== "manager") {
    throw new AuthError("Manager access required", 403);
  }
  return user;
}

export function requireCustomer(user: SessionUser | null): SessionUser {
  if (!user) throw new AuthError("Authentication required", 401);
  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export async function registerCustomer(input: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  dateOfBirth?: string;
}): Promise<{ userId: string; customerId: string }> {
  const email = input.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AuthError("An account with this email already exists", 409);

  const passwordHash = await hashPassword(input.password);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        role: PrismaUserRole.customer,
        emailVerified: false,
      },
    });

    const profile = await tx.customerProfile.create({
      data: {
        userId: user.id,
        fullName: input.fullName.trim(),
        phone: input.phone?.trim() || null,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
      },
    });

    await tx.customerPreference.create({
      data: { customerId: profile.id },
    });

    const referral = `AE${profile.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
    const loyalty = await tx.loyaltyAccount.create({
      data: {
        customerId: profile.id,
        points: 50,
        lifetimePoints: 50,
        referralCode: referral,
        tier: "bronze",
      },
    });

    await tx.loyaltyTransaction.create({
      data: {
        accountId: loyalty.id,
        points: 50,
        type: "bonus",
        description: "Welcome bonus points",
      },
    });

    await tx.timelineEvent.create({
      data: {
        customerId: profile.id,
        userId: user.id,
        eventType: "registered",
        title: "Account registered",
        description: "Customer created an online account",
        createdById: user.id,
      },
    });

    const newSegment = await tx.segment.findUnique({ where: { name: "New customers" } });
    if (newSegment) {
      await tx.customerSegment.create({
        data: { customerId: profile.id, segmentId: newSegment.id },
      });
    }

    return { userId: user.id, customerId: profile.id };
  });

  return result;
}

export async function registerGoogleCustomer(input: {
  email: string;
  googleId: string;
  fullName: string;
}): Promise<{ userId: string; customerId: string }> {
  const email = input.email.toLowerCase().trim();
  
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        googleId: input.googleId,
        role: PrismaUserRole.customer,
        emailVerified: true,
      },
    });

    const profile = await tx.customerProfile.create({
      data: {
        userId: user.id,
        fullName: input.fullName.trim(),
      },
    });

    await tx.customerPreference.create({
      data: { customerId: profile.id },
    });

    const referral = `AE${profile.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
    const loyalty = await tx.loyaltyAccount.create({
      data: {
        customerId: profile.id,
        points: 50,
        lifetimePoints: 50,
        referralCode: referral,
        tier: "bronze",
      },
    });

    await tx.loyaltyTransaction.create({
      data: {
        accountId: loyalty.id,
        points: 50,
        type: "bonus",
        description: "Welcome bonus points",
      },
    });

    await tx.timelineEvent.create({
      data: {
        customerId: profile.id,
        userId: user.id,
        eventType: "registered",
        title: "Account registered",
        description: "Customer created an online account via Google",
        createdById: user.id,
      },
    });

    const newSegment = await tx.segment.findUnique({ where: { name: "New customers" } });
    if (newSegment) {
      await tx.customerSegment.create({
        data: { customerId: profile.id, segmentId: newSegment.id },
      });
    }

    return { userId: user.id, customerId: profile.id };
  });

  return result;
}

export async function loginWithPassword(email: string, password: string): Promise<SessionUser> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { profile: true },
  });

  if (!user || user.status !== "active") {
    throw new AuthError("Invalid email or password", 401);
  }

  if (!user.passwordHash) {
    throw new AuthError("Please sign in with Google.", 401);
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw new AuthError("Invalid email or password", 401);

  await createSession(user.id);

  return {
    id: user.id,
    email: user.email,
    role: user.role as UserRole,
    fullName: user.profile?.fullName ?? null,
    customerId: user.profile?.id ?? null,
  };
}

export async function createPasswordReset(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
  if (!user) return null;

  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 2);

  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });

  return token;
}

export async function createEmailVerification(userId: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  await prisma.emailVerification.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });

  return token;
}

export async function verifyEmailWithToken(token: string): Promise<boolean> {
  const row = await prisma.emailVerification.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!row || row.verifiedAt || row.expiresAt < new Date()) return false;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { emailVerified: true },
    }),
    prisma.emailVerification.update({
      where: { id: row.id },
      data: { verifiedAt: new Date() },
    }),
  ]);

  return true;
}

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<boolean> {
  const row = await prisma.passwordReset.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!row || row.usedAt || row.expiresAt < new Date()) return false;

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash },
    }),
    prisma.passwordReset.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
    prisma.session.deleteMany({ where: { userId: row.userId } }),
  ]);

  return true;
}
