import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import { isSafeInternalPath } from '@/app/lib/session-claim';
import { appBaseUrl } from '@/app/lib/env';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    const fallback = new URL('/login', request.url);
    fallback.searchParams.set('error', 'Google sign-in is unavailable. Please use your email and password.');
    const next = new URL(request.url).searchParams.get('next');
    if (isSafeInternalPath(next)) fallback.searchParams.set('next', next);
    return NextResponse.redirect(fallback);
  }

  const origin = appBaseUrl(request);
  const redirectUri = `${origin}/api/auth/google/callback`;

  const client = new OAuth2Client(clientId, clientSecret, redirectUri);

  // State protects against CSRF. 16 random bytes hex = 32 chars.
  const state = randomBytes(16).toString('hex');
  const cookieStore = await cookies();
  cookieStore.set('google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  });

  const next = new URL(request.url).searchParams.get('next');
  cookieStore.set('google_oauth_next', isSafeInternalPath(next) ? next : '', {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 600, path: '/',
  });

  const authorizeUrl = client.generateAuthUrl({
    access_type: 'online', // we don't need refresh tokens for sign-in
    prompt: 'select_account', // let users pick which Google account to use
    // This callback verifies Google's OpenID Connect ID token. The `openid`
    // scope is therefore required; without it Google may return an access
    // token but no `id_token`, causing the callback to fail after account
    // selection and fall back to the generic authentication error.
    scope: [
      'openid',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    state,
    redirect_uri: redirectUri,
  });

  return NextResponse.redirect(authorizeUrl);
}
