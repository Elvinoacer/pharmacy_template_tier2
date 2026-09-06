import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { cookies } from 'next/headers';
import { prisma } from '@/app/lib/db';
import {
  createSession,
  registerGoogleCustomer,
} from '@/app/lib/auth';
import { recordAudit } from "@/app/lib/platform/audit";
import { appBaseUrl, getRequestMeta } from '@/app/lib/env';
import { resolvePostLoginPath } from '@/app/lib/session-claim';

export const runtime = 'nodejs';

function loginRedirect(origin: string, error: string): NextResponse {
  const url = new URL('/login', origin);
  url.searchParams.set('error', error);
  return NextResponse.redirect(url);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isSessionClaimConfigurationError(error: unknown): boolean {
  const message = errorMessage(error);
  return message.includes('AUTH_SECRET is not set') || message.includes('AUTH_SECRET is required');
}

export async function GET(request: Request) {
  const origin = appBaseUrl(request);
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieStore = await cookies();
  const next = cookieStore.get('google_oauth_next')?.value;
  cookieStore.delete('google_oauth_next');
  const savedState = cookieStore.get('google_oauth_state')?.value;
  // Always delete — state is single-use.
  cookieStore.delete('google_oauth_state');

  // Validate OAuth state to prevent CSRF.
  if (!code || !state || !savedState || state !== savedState) {
    return loginRedirect(origin, 'Invalid OAuth state. Please try again.');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return loginRedirect(origin, 'Google OAuth is not configured on the server.');
  }

  const redirectUri = `${origin}/api/auth/google/callback`;
  const client = new OAuth2Client(clientId, clientSecret, redirectUri);

  try {
    const { tokens } = await client.getToken(code);
    const idToken = tokens.id_token;
    if (!idToken) {
      return loginRedirect(origin, 'Google did not return an ID token.');
    }

    const ticket = await client.verifyIdToken({
      idToken,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    if (!payload) {
      return loginRedirect(origin, 'Google token payload was empty.');
    }
    if (!payload.email) {
      return loginRedirect(origin, 'Your Google account has no email address.');
    }
    if (!payload.email_verified) {
      return loginRedirect(origin, 'Please verify your email with Google first.');
    }

    const email = payload.email.toLowerCase().trim();
    const googleId = payload.sub;
    const name = payload.name?.trim() || email.split('@')[0];

    let user = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { googleId }],
      },
      include: { profile: true },
    });

    let auditAction: 'login' | 'register';
    if (user) {
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId,
            emailVerified: true,
          },
          include: { profile: true },
        });
      }
      auditAction = 'login';
    } else {
      const { userId } = await registerGoogleCustomer({
        email,
        googleId,
        fullName: name,
      });
      user = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });
      if (!user) {
        return loginRedirect(origin, 'Account creation failed. Please try again.');
      }
      auditAction = 'register';
    }

    if (user.status !== 'active') {
      return loginRedirect(origin, 'Your account is not active. Contact support.');
    }

    // Establish the real DB-backed session before any non-essential logging.
    // Audit failures must never prevent a user from signing in.
    const meta = await getRequestMeta();
    try {
      await createSession(user.id, { ip: meta.ip, userAgent: meta.userAgent });
    } catch (error) {
      // createSession writes the opaque DB-backed session cookie first. The
      // signed claim is only a proxy optimization and proxy.ts already falls
      // back to that opaque session when no valid claim is available. Do not
      // turn a missing claim-signing secret into a total login outage.
      if (!isSessionClaimConfigurationError(error)) throw error;
      console.error('[google oauth callback] session claim unavailable; continuing with DB session', error);
    }

    try {
      await recordAudit({ actorId: user.id, action: auditAction, resource: 'user', resourceId: user.id, details: { provider: 'google' } });
    } catch (error) {
      console.error('[google oauth callback] audit log failed', error);
    }

    const target = resolvePostLoginPath({
      role: user.role,
      customerId: user.profile?.id ?? null,
      platformAdmin: user.platformAdmin === true,
    }, next);
    return NextResponse.redirect(new URL(target, origin));
  } catch (error) {
    console.error('[google oauth callback]', error);
    return loginRedirect(origin, 'Google authentication failed. Please try again.');
  }
}
