import { createHash } from "crypto";
import { NextResponse } from "next/server";
import {
  getSessionUser,
  verifyEmailWithToken,
} from "@/app/lib/auth";
import { prismaUnscoped } from "@/app/lib/db";

export const runtime = "nodejs";

type VerificationContext = {
  userId: string | null;
  emailVerified: boolean;
  hasOpenPharmacyOnboarding: boolean;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function loadVerificationContext(token: string): Promise<VerificationContext> {
  if (!token) {
    return {
      userId: null,
      emailVerified: false,
      hasOpenPharmacyOnboarding: false,
    };
  }

  const verification = await prismaUnscoped.emailVerification.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { userId: true },
  });

  if (!verification) {
    return {
      userId: null,
      emailVerified: false,
      hasOpenPharmacyOnboarding: false,
    };
  }

  const [user, openPharmacy] = await Promise.all([
    prismaUnscoped.user.findUnique({
      where: { id: verification.userId },
      select: { emailVerified: true },
    }),
    prismaUnscoped.pharmacy.findFirst({
      where: {
        ownerUserId: verification.userId,
        OR: [
          { status: { in: ["draft", "needs_info", "submitted", "under_review", "approved"] } },
          { listed: false },
        ],
      },
      select: { id: true },
    }),
  ]);

  return {
    userId: verification.userId,
    emailVerified: Boolean(user?.emailVerified),
    hasOpenPharmacyOnboarding: Boolean(openPharmacy),
  };
}

function onboardingDestination() {
  return "/onboard?verified=1";
}

function customerDestination() {
  return "/portal/profile?verified=1";
}

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url), 303);
}

function redirectToLogin(request: Request, next: string, verified: boolean) {
  const url = new URL("/login", request.url);
  url.searchParams.set("verified", verified ? "1" : "0");
  if (verified) url.searchParams.set("next", next);
  return NextResponse.redirect(url, 303);
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";

  try {
    // Read the token owner before consuming the token. This lets us restore the
    // correct product journey even when the verification link is opened in a
    // different browser/device with no existing session.
    const before = await loadVerificationContext(token);
    const verifiedNow = token ? await verifyEmailWithToken(token) : false;
    const after = verifiedNow ? await loadVerificationContext(token) : before;

    // A verification GET is intentionally idempotent for an already-verified
    // token owner. The old implementation treated a refreshed/consumed link as
    // a failure, which then sent an authenticated onboarding owner through the
    // login/dashboard redirect path.
    const verified = verifiedNow || after.emailVerified;
    if (!verified || !after.userId) {
      return redirectToLogin(request, "/portal/profile", false);
    }

    const destination = after.hasOpenPharmacyOnboarding
      ? onboardingDestination()
      : customerDestination();

    const session = await getSessionUser().catch(() => null);
    if (session?.id === after.userId) {
      return redirectTo(request, destination);
    }

    // Verification is complete, but this browser is not authenticated as the
    // token owner. Sign in first, then resume the same journey rather than
    // dropping the user on a generic dashboard.
    return redirectToLogin(request, destination, true);
  } catch (error) {
    console.error("[verify-email] callback failed", error);
    return redirectToLogin(request, "/portal/profile", false);
  }
}
