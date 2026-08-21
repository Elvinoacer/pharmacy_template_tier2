import "server-only";

import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/app/lib/db";
import type { SessionUser, UserRole } from "@/app/lib/types";
import { STAFF_ROLES } from "@/app/lib/types";
import { UserRole as PrismaUserRole } from "@/app/generated/prisma/client";
import { addTimelineEvent, writeAuditLog } from "@/app/lib/timeline";
import {
  SESSION_CLAIM_COOKIE,
  signSessionClaim,
} from "@/app/lib/session-claim";
import { parseLocalDateInput } from "@/app/lib/time";
import { prismaUnscoped } from "@/app/lib/db";
import { STAFF_PHARMACY_COOKIE, PUBLIC_PHARMACY_COOKIE } from "@/app/lib/tenant-context";
import { getTenant } from "@/app/lib/tenant";

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

type UserWithMemberships = {
  id: string;
  email: string;
  role: string;
  platformAdmin?: boolean;
  profile?: { id: string; fullName: string | null } | null;
  memberships?: Array<{
    role: string;
    status: string;
    pharmacy: { id: string; slug: string; name: string };
  }>;
};

function membershipsOf(user: UserWithMemberships): SessionUser["memberships"] {
  return (user.memberships ?? []).map((m) => ({
    pharmacyId: m.pharmacy.id,
    slug: m.pharmacy.slug,
    name: m.pharmacy.name,
    role: m.role as SessionUser["memberships"][number]["role"],
    status: m.status,
  }));
}

async function toSessionUser(user: UserWithMemberships): Promise<SessionUser> {
  const memberships = membershipsOf(user);
  let activePharmacyId: string | null = memberships[0]?.pharmacyId ?? null;
  try {
    const jar = await cookies();
    const cookieId = jar.get(STAFF_PHARMACY_COOKIE)?.value;
    if (cookieId && memberships.some((m) => m.pharmacyId === cookieId)) {
      activePharmacyId = cookieId;
    }
  } catch {
    // ignore
  }
  return {
    id: user.id,
    email: user.email,
    role: user.role as UserRole,
    fullName: user.profile?.fullName ?? null,
    customerId: user.profile?.id ?? null,
    platformAdmin: user.platformAdmin === true,
    memberships,
    activePharmacyId,
  };
}

export async function createSession(
  userId: string,
  meta?: { ip?: string; userAgent?: string },
): Promise<string> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);

  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      ipAddress: meta?.ip ?? null,
      userAgent: meta?.userAgent ?? null,
    },
    include: {
      user: {
        include: {
          profile: true,
          memberships: {
            where: { status: "active" },
            include: { pharmacy: { select: { id: true, slug: true, name: true, status: true } } },
          },
        },
      },
    },
  });

  const user = session.user;
  const isSecure = process.env.NODE_ENV === "production";
  const cookieStore = await cookies();
  const mapped = await toSessionUser(user);

  // 1) DB-backed opaque session token — the source of truth.
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  if (mapped.activePharmacyId) {
    cookieStore.set(STAFF_PHARMACY_COOKIE, mapped.activePharmacyId, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });
  }

  // 2) Signed JWT claim — used by proxy.ts for fast (DB-free) auth checks.
  //    The DB lookup still happens in the layout (getSessionUser) for fresh data.
  try {
    const claim = await signSessionClaim(
      {
        sub: user.id,
        role: user.role as string,
        customerId: user.profile?.id ?? null,
        platformAdmin: mapped.platformAdmin,
        pharmacyId: mapped.activePharmacyId,
      },
      expiresAt,
    );
    cookieStore.set(SESSION_CLAIM_COOKIE, claim, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });
  } catch {
    // AUTH_SECRET missing in dev — log and continue with DB-only auth.
    // Production should fail loudly via getAuthSecret() at startup.
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET is required in production.");
    }
    console.warn("[auth] AUTH_SECRET not set — skipping session-claim cookie (dev only).");
  }

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
    try {
      await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
    } catch {
      // Best-effort cleanup; cookie is cleared regardless.
    }
  }
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(SESSION_CLAIM_COOKIE);
  cookieStore.delete(STAFF_PHARMACY_COOKIE);
}

export async function getSessionUserByToken(token: string): Promise<SessionUser | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        include: {
          profile: true,
          memberships: {
            where: { status: "active" },
            include: { pharmacy: { select: { id: true, slug: true, name: true, status: true } } },
          },
        },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (session.user.status !== "active") return null;

  return toSessionUser(session.user);
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
  if (!user || (user.role !== "manager" && !user.memberships.some((m) => m.role === "owner" || m.role === "manager"))) {
    throw new AuthError("Manager access required", 403);
  }
  return user;
}

export function requirePlatformAdmin(user: SessionUser | null): SessionUser {
  if (!user || !user.platformAdmin) {
    throw new AuthError("Platform admin access required", 403);
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
        dateOfBirth: input.dateOfBirth ? parseLocalDateInput(input.dateOfBirth) : null,
      },
    });

    await tx.customerPreference.create({
      data: { customerId: profile.id },
    });

    const tenant = await getTenant().catch(() => ({ pharmacyId: null as string | null }));
    if (tenant.pharmacyId) {
      await provisionCustomerAtPharmacy(tx, {
        profileId: profile.id,
        userId: user.id,
        pharmacyId: tenant.pharmacyId,
        title: "Account registered",
        description: "Customer created an online account",
      });
    }

    return { userId: user.id, customerId: profile.id };
  });

  return result;
}

async function provisionCustomerAtPharmacy(
  tx: {
    customerPharmacy: { upsert: Function };
    loyaltyAccount: { create: Function };
    loyaltyTransaction: { create: Function };
    timelineEvent: { create: Function };
    segment: { findFirst: Function };
    customerSegment: { create: Function };
  },
  opts: {
    profileId: string;
    userId: string;
    pharmacyId: string;
    title: string;
    description: string;
  },
) {
  await tx.customerPharmacy.upsert({
    where: {
      customerId_pharmacyId: { customerId: opts.profileId, pharmacyId: opts.pharmacyId },
    },
    create: { customerId: opts.profileId, pharmacyId: opts.pharmacyId, preferred: true },
    update: {},
  });

  const referral = `AE${opts.profileId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  const loyalty = await tx.loyaltyAccount.create({
    data: {
      pharmacyId: opts.pharmacyId,
      customerId: opts.profileId,
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
      pharmacyId: opts.pharmacyId,
      customerId: opts.profileId,
      userId: opts.userId,
      eventType: "registered",
      title: opts.title,
      description: opts.description,
      createdById: opts.userId,
    },
  });

  const newSegment = await tx.segment.findFirst({
    where: { name: "New customers", pharmacyId: opts.pharmacyId },
  });
  if (newSegment) {
    await tx.customerSegment.create({
      data: { customerId: opts.profileId, segmentId: newSegment.id },
    });
  }
}

export async function registerGoogleCustomer(input: {
  email: string;
  googleId: string;
  fullName: string;
}): Promise<{ userId: string; customerId: string }> {
  const email = input.email.toLowerCase().trim();

  // Defensive: re-check for race condition where user was created between
  // the callback's findFirst and this call.
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { googleId: input.googleId }],
    },
  });
  if (existing) {
    throw new AuthError("An account with this email already exists", 409);
  }

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

    const tenant = await getTenant().catch(() => ({ pharmacyId: null as string | null }));
    if (tenant.pharmacyId) {
      await provisionCustomerAtPharmacy(tx, {
        profileId: profile.id,
        userId: user.id,
        pharmacyId: tenant.pharmacyId,
        title: "Account registered",
        description: "Customer created an online account via Google",
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

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    throw new AuthError("Session could not be established", 500);
  }
  return sessionUser;
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

// Validate that AUTH_SECRET is configured. Called eagerly from app startup
// (see app/lib/ensure-env.ts). Throws on misconfiguration so the app fails
// loudly rather than at the first sign-in attempt.
export function assertAuthSecretConfigured(): void {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET is missing or too short (need >= 16 chars). Generate one with `openssl rand -base64 32` and set it in .env.local.",
    );
  }
}
