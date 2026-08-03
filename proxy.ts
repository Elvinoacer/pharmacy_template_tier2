import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySessionClaim, claimIsStaff, isSafeInternalPath } from '@/app/lib/session-claim'

/**
 * Authentication gate for /portal and /admin.
 *
 * Uses the signed JWT session-claim cookie (aether_session_claim) for a
 * fast DB-free check. The full DB-backed session is still verified by
 * the layout's `getSessionUser()` call — this proxy only decides whether
 * to short-circuit to a redirect.
 *
 * Why not just call getSessionUser() here? In Next.js 16, proxy runs on
 * every matching request. Hitting the database for every page navigation
 * adds latency and can fail when the DB is briefly unreachable. The JWT
 * check is sub-millisecond and stateless.
 */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (
    !pathname.startsWith('/portal') &&
    !pathname.startsWith('/admin') &&
    !pathname.startsWith('/caregiver')
  ) {
    return NextResponse.next();
  }

  // Public accept page must stay reachable without a session.
  if (pathname.startsWith('/caregiver/accept')) {
    return NextResponse.next();
  }

  const claimCookie = request.cookies.get('aether_session_claim')?.value;
  const sessionCookie = request.cookies.get('aether_session')?.value;

  // No auth cookies at all → bounce to login.
  if (!claimCookie && !sessionCookie) {
    const loginUrl = new URL(`/login?next=${encodeURIComponent(pathname)}`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  let role: string | null = null;
  let customerId: string | null = null;

  if (claimCookie) {
    const claim = await verifySessionClaim(claimCookie);
    if (claim) {
      role = claim.role;
      customerId = claim.customerId;
    }
  }

  // If the JWT claim is missing/invalid, fall back to the opaque session
  // cookie's presence. The layout will do the authoritative DB check and
  // redirect to /login if the session is actually invalid. This keeps
  // proxy fast while remaining correct.
  if (!role && sessionCookie) {
    // We don't know the role yet — let the request through and let the
    // layout decide. This is safe because /portal and /admin layouts
    // both call getSessionUser() and redirect if needed.
    return NextResponse.next();
  }

  if (!role) {
    const loginUrl = new URL(`/login?next=${encodeURIComponent(pathname)}`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  const staff = claimIsStaff(role);

  // Staff-only routes: redirect non-staff to /portal.
  if (pathname.startsWith('/admin') && !staff) {
    return NextResponse.redirect(new URL('/portal', request.url));
  }

  // Caregivers use /caregiver (and limited portal refill flows). Staff without a
  // customer profile go to /admin. Pure caregivers hitting /portal land on /caregiver.
  if (pathname.startsWith('/portal') && role === 'caregiver') {
    // Allow refill request flow for caregivers acting on behalf of patients.
    const allowedForCaregiver =
      pathname.startsWith('/portal/refills') ||
      pathname.startsWith('/portal/onboarding');
    if (!allowedForCaregiver) {
      return NextResponse.redirect(new URL('/caregiver', request.url));
    }
  }

  // Customer portal: staff without a customer profile go to /admin.
  if (pathname.startsWith('/portal') && staff && !customerId) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // Onboarding guard: customers who haven't completed onboarding are
  // redirected to /portal/onboarding — EXCEPT when they're already there
  // (avoid infinite loop) or hitting an API route / static asset.
  // The layout does the authoritative DB check; proxy just short-circuits
  // common cases so the redirect feels instant.
  if (pathname.startsWith('/portal') && !staff && customerId) {
    // Allow the onboarding page itself, plus API routes and static assets.
    const isOnboardingPage = pathname === '/portal/onboarding';
    const isApiOrStatic = pathname.includes('/api/') || pathname.startsWith('/portal/_next/');
    if (!isOnboardingPage && !isApiOrStatic) {
      // We can't check onboardingCompletedAt in the proxy (no DB), so we let
      // the layout handle it. Proxy just makes sure /portal/onboarding is
      // always reachable for authenticated customers.
    }
  }

  // Honor safe `?next=` overrides on login redirects (already encoded above).
  const next = request.nextUrl.searchParams.get('next');
  if (isSafeInternalPath(next) && !next.startsWith('/portal') && !next.startsWith('/admin')) {
    // Allow redirect to other safe internal paths post-auth.
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/portal/:path*', '/admin/:path*', '/caregiver', '/caregiver/:path*'],
}
