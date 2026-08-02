import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { cookies } from 'next/headers';
import { prisma } from '@/app/lib/db';
import {
  createSession,
  registerGoogleCustomer,
  writeAuditLog,
  isStaff,
} from '@/app/lib/auth';
import { appBaseUrl, getRequestMeta } from '@/app/lib/env';

export const runtime = 'nodejs';

function loginRedirect(origin: string, error: string): NextResponse {
  const url = new URL('/login', origin);
  url.searchParams.set('error', error);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const origin = appBaseUrl(request);
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieStore = await cookies();
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
    // Exchange the authorization code for tokens.
    const { tokens } = await client.getToken(code);
    const idToken = tokens.id_token;
    if (!idToken) {
      return loginRedirect(origin, 'Google did not return an ID token.');
    }

    // Verify the ID token signature against Google's keys + our audience.
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
    // Reject unverified Google emails — otherwise anyone could register
    // a Google account with someone else's email and sign in.
    if (!payload.email_verified) {
      return loginRedirect(origin, 'Please verify your email with Google first.');
    }

    const email = payload.email.toLowerCase().trim();
    const googleId = payload.sub;
    const name = payload.name?.trim() || email.split('@')[0];

    // Look up existing user by email OR googleId (handles email changes on Google side).
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { googleId },
        ],
      },
      include: { profile: true },
    });

    if (user) {
      // Link Google ID if not yet linked.
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
      await writeAuditLog(user.id, 'login', 'user', user.id, { provider: 'google' });
    } else {
      // Create a new customer account.
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
      await writeAuditLog(user.id, 'register', 'user', user.id, { provider: 'google' });
    }

    if (user.status !== 'active') {
      return loginRedirect(origin, 'Your account is not active. Contact support.');
    }

    const meta = await getRequestMeta();
    await createSession(user.id, { ip: meta.ip, userAgent: meta.userAgent });

    // Route staff to /admin, customers to /portal.
    const target = isStaff(user.role as never) ? '/admin' : '/portal';
    return NextResponse.redirect(new URL(target, origin));
  } catch (error) {
    console.error('[google oauth callback]', error);
    return loginRedirect(origin, 'Google authentication failed. Please try again.');
  }
}
