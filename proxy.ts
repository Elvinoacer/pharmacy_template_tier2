import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySessionClaim, claimIsStaff, isSafeInternalPath } from '@/app/lib/session-claim'

const PUBLIC_PHARMACY_COOKIE = 'afyvia_pharmacy'
const PUBLIC_SLUG_RE = /^[a-z0-9][a-z0-9-]{1,60}$/i

function publicPharmacyCookie() {
  return {
    path: '/',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === 'production',
  }
}

const TENANT_HEADERS = ['x-platform-bypass', 'x-pharmacy-id', 'x-pharmacy-slug'] as const

const EXTERNAL_API_PREFIXES = [
  '/api/cron/',
  '/api/webhooks/',
  '/api/payments/daraja/',
  '/api/integrations/',
  '/api/v1/',
] as const

function isExternalApiPath(pathname: string): boolean {
  return EXTERNAL_API_PREFIXES.some((p) => pathname.startsWith(p))
}

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return false
  try {
    const originUrl = new URL(origin)
    const host =
      request.headers.get('x-forwarded-host') ??
      request.headers.get('host') ??
      request.nextUrl.host
    return originUrl.host === host
  } catch {
    return false
  }
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const requestHeaders = new Headers(request.headers)

  for (const h of TENANT_HEADERS) requestHeaders.delete(h)
  requestHeaders.set('x-pathname', pathname)
  requestHeaders.set('x-return-path', pathname + request.nextUrl.search)

  // Cron credentials are bearer-only. Reject legacy query-string credentials
  // before any individual cron handler can inspect them, so URL logs/history
  // can never become an authentication mechanism.
  if (pathname.startsWith('/api/cron/') && request.nextUrl.searchParams.has('secret')) {
    return NextResponse.json(
      { error: 'cron_query_secret_not_allowed' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  if (
    pathname.startsWith('/api/') &&
    !isExternalApiPath(pathname) &&
    !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
    !sameOrigin(request)
  ) {
    return new NextResponse('Cross-origin request rejected', { status: 403 })
  }

  // Public storefronts resolve their tenant from /p/{slug}. Remember the
  // shop so later visits to /careers, /contact, /delivery and /faq can show
  // that pharmacy's content without requiring the prefixed URL.
  if (pathname === '/p' || pathname.startsWith('/p/')) {
    const slug = pathname.split('/')[2]
    if (slug && PUBLIC_SLUG_RE.test(slug)) {
      requestHeaders.set('x-pharmacy-slug', slug.toLowerCase())
    }
    const response = NextResponse.next({ request: { headers: requestHeaders } })
    response.headers.set('Cache-Control', 'no-store')
    if (slug && PUBLIC_SLUG_RE.test(slug)) {
      response.cookies.set(PUBLIC_PHARMACY_COOKIE, slug.toLowerCase(), publicPharmacyCookie())
    }
    return response
  }

  if (pathname.startsWith('/platform') || pathname.startsWith('/api/platform')) {
    requestHeaders.set('x-platform-bypass', '1')
  }

  const staffPharmacy = request.cookies.get('afyvia_staff_pharmacy')?.value
  if (
    staffPharmacy &&
    (pathname.startsWith('/admin') || pathname.startsWith('/api/admin'))
  ) {
    requestHeaders.set('x-pharmacy-id', staffPharmacy)
  }

  const needsAuth =
    pathname.startsWith('/portal') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/caregiver') ||
    pathname.startsWith('/platform')

  if (!needsAuth) {
    if (!requestHeaders.get('x-pharmacy-slug')) {
      const cookieSlug = request.cookies.get(PUBLIC_PHARMACY_COOKIE)?.value?.trim().toLowerCase()
      if (cookieSlug && PUBLIC_SLUG_RE.test(cookieSlug)) {
        if (
          pathname.startsWith('/api/feel') ||
          pathname.startsWith('/api/vaccinations') ||
          pathname.startsWith('/api/screenings')
        ) {
          requestHeaders.set('x-pharmacy-slug', cookieSlug)
        }
      }
    }
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  if (pathname.startsWith('/caregiver/accept')) {
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  const claimCookie = request.cookies.get('afyvia_session_claim')?.value
  const sessionCookie = request.cookies.get('afyvia_session')?.value

  if (!claimCookie && !sessionCookie) {
    const loginUrl = new URL(`/login?next=${encodeURIComponent(pathname + request.nextUrl.search)}`, request.url)
    return NextResponse.redirect(loginUrl)
  }

  let role: string | null = null
  let customerId: string | null = null
  let platformAdmin = false

  if (claimCookie) {
    const claim = await verifySessionClaim(claimCookie)
    if (claim) {
      role = claim.role
      customerId = claim.customerId
      platformAdmin = claim.platformAdmin
    }
  }

  if (!role && sessionCookie) {
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  if (!role) {
    const loginUrl = new URL(`/login?next=${encodeURIComponent(pathname + request.nextUrl.search)}`, request.url)
    return NextResponse.redirect(loginUrl)
  }

  const staff = claimIsStaff(role)

  if (pathname.startsWith('/platform') && !platformAdmin) {
    return NextResponse.redirect(new URL(staff ? '/admin' : '/portal', request.url))
  }

  if (pathname.startsWith('/admin') && !staff && !platformAdmin) {
    return NextResponse.redirect(new URL('/portal', request.url))
  }

  if (pathname.startsWith('/portal') && role === 'caregiver') {
    const allowedForCaregiver =
      pathname.startsWith('/portal/refills') ||
      pathname.startsWith('/portal/onboarding')
    if (!allowedForCaregiver) {
      return NextResponse.redirect(new URL('/caregiver', request.url))
    }
  }

  if (pathname.startsWith('/portal') && staff && !customerId) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  const next = request.nextUrl.searchParams.get('next')
  if (isSafeInternalPath(next) && !next.startsWith('/portal') && !next.startsWith('/admin')) {
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)',
  ],
}
