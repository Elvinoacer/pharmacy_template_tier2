import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { cookies } from 'next/headers';
import { prisma } from '@/app/lib/db';
import { createSession, registerGoogleCustomer, writeAuditLog, isStaff } from '@/app/lib/auth';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  const cookieStore = await cookies();
  const savedState = cookieStore.get('google_oauth_state')?.value;
  cookieStore.delete('google_oauth_state');

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(new URL('/login?error=Invalid+OAuth+state', request.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/login?error=Google+OAuth+not+configured', request.url));
  }

  const redirectUri = `${url.origin}/api/auth/google/callback`;
  const client = new OAuth2Client(clientId, clientSecret, redirectUri);

  try {
    const { tokens } = await client.getToken(code);
    const idToken = tokens.id_token;
    if (!idToken) throw new Error('No ID token');

    const ticket = await client.verifyIdToken({
      idToken,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) throw new Error('Invalid Google payload');

    const email = payload.email.toLowerCase().trim();
    const googleId = payload.sub;
    const name = payload.name || email.split('@')[0];

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (user) {
      if (!user.googleId) {
        // Link Google ID
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId, emailVerified: true },
          include: { profile: true }
        });
      }
      await writeAuditLog(user.id, "login", "user", user.id, { provider: "google" });
    } else {
      // Create new customer
      const { userId } = await registerGoogleCustomer({
        email,
        googleId,
        fullName: name,
      });
      user = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });
      if (!user) throw new Error('Failed to create user');
    }

    if (user.status !== "active") {
      return NextResponse.redirect(new URL('/login?error=Account+is+not+active', request.url));
    }

    await createSession(user.id);
    
    if (isStaff(user.role)) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    
    return NextResponse.redirect(new URL('/portal', request.url));
  } catch (error) {
    console.error('Google OAuth Error:', error);
    return NextResponse.redirect(new URL('/login?error=Google+authentication+failed', request.url));
  }
}
