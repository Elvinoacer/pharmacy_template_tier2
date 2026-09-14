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
  cookieStore.delete('google_oauth_state');

  if (!code || !state || !savedState || state !== savedState) {
    return loginRedirect(origin, 'This sign-in request has expired or is invalid. Please try again.');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error('[external sign-in] provider configuration is unavailable');
    return loginRedirect(origin, 'This sign-in option is temporarily unavailable. Please use another sign-in method or try again later.');
  }

  const redirectUri = `${origin}/api/auth/google/callback`;
  const client = new OAuth2Client(clientId, clientSecret, redirectUri);

  try {
    const { tokens } = await client.getToken(code);
    const idToken = tokens.id_token;
    if (!idToken) {
      console.error('[external sign-in] identity token missing');
      return loginRedirect(origin, 'We could not complete sign-in. Please try again.');
    }

    const ticket = await client.verifyIdToken({
      idToken,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    if (!payload) {
      console.error('[external sign-in] verified identity payload missing');
      return loginRedirect(origin, 'We could not complete sign-in. Please try again.');
    }
    if (!payload.email) {
      return loginRedirect(origin, 'This sign-in account does not provide an email address. Please use another sign-in method.');
    }
    if (!payload.email_verified) {
      return loginRedirect(origin, 'Please verify the email address on your sign-in account first.');
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

    const meta = await getRequestMeta();
    try {
      await createSession(user.id, { ip: meta.ip, userAgent: meta.userAgent });
    } catch (error) {
      if (!isSessionClaimConfigurationError(error)) throw error;
      console.error('[external sign-in] session claim unavailable; continuing with DB session', error);
    }

    try {
      await recordAudit({ actorId: user.id, action: auditAction, resource: 'user', resourceId: user.id, details: { provider: 'google' } });
    } catch (error) {
      console.error('[external sign-in] audit log failed', error);
    }

    const target = resolvePostLoginPath({
      role: user.role,
      customerId: user.profile?.id ?? null,
      platformAdmin: user.platformAdmin === true,
    }, next);
    return NextResponse.redirect(new URL(target, origin));
  } catch (error) {
    console.error('[external sign-in]', error);
    return loginRedirect(origin, 'We could not complete sign-in. Please try again or use another sign-in method.');
  }
}
