import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Google OAuth not configured." }, { status: 500 });
  }

  const url = new URL(request.url);
  const redirectUri = `${url.origin}/api/auth/google/callback`;

  const client = new OAuth2Client(
    clientId,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  const state = randomBytes(16).toString('hex');
  const cookieStore = await cookies();
  cookieStore.set('google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10,
    path: '/',
  });

  const authorizeUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    state,
  });

  return NextResponse.redirect(authorizeUrl);
}
