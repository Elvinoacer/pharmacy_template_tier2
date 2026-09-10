import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySessionClaim, claimIsStaff, isSafeInternalPath } from '@/app/lib/session-claim'

const TENANT_HEADERS = ['x-platform-bypass', 'x-pharmacy-id', 'x-pharmacy-slug'] as const

const EXTERNAL_API_PREFIXES = [
  '/api/cron/',
  '/api/webhooks/',
  '/api/payments/daraja/callback',
  '/api/integrations/',
  '/api/v1/',
] as const

const REMEMBERED_PUBLIC_TENANT_PREFIXES = [
  '/services',
  '/medicines',
  '/refill',
  '/order',
  '/search',
  '/preventive',
  '/screenings',
  '/vaccinations',
  '/delivery',
  '/faq',
  '/careers',
  '/contact',
] as const

// Discovery roots are marketplaces, not implicit tenant rooms. A remembered
// pharmacy must not silently collapse these pages back to one tenant.
const NETWORK_BROWSE_ROOTS = new Set(['/medicines', '/services'])

function isExternalApiPath(pathname: string): boolean {
  return EXTERNAL_API_PREFIXES.some((p) => pathname.startsWith(p))
}

function usesRememberedPublicTenant(pathname: string): boolean {
  if (NETWORK_BROWSE_ROOTS.has(pathname)) return false
  return REMEMBERED_PUBLIC_TENANT_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
}

function validPublicSlug(value: string | undefined): value is string {
  return Boolean(value && /^[a-z0-9][a-z0-9-]{1,60}$/i.test(value))
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

  const storefront = pathname.match(/^\/p\/([a-z0-9][a-z0-9-]{1,60})(\/.*)?$/i)
  if (storefront) {
    const slug = storefront[1].toLowerCase()
    const rest = storefront[2] || ''
    const restPath = rest === '' || rest === '/' ? '/' : rest
    const firstSeg = restPath === '/' ? '' : restPath.split('/').filter(Boolean)[0] || ''

    const reserved = new Set([
      'login', 'register', 'forgot-password', 'reset-password',
      'portal', 'admin', 'platform', 'onboard', 'api', '_next',
    ])
    if (!reserved.has(firstSeg)) {
      // The storefront root still renders through an internal rewrite so its
      // canonical /p/{slug} address remains stable.
      if (restPath === '/') {
        const url = request.nextUrl.clone()
        url.pathname = '/storefront'
        requestHeaders.set('x-pharmacy-slug', slug)
        const res = NextResponse.rewrite(url, { request: { headers: requestHeaders } })
        res.cookies.set('aether_pharmacy', slug, {
          path: '/',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30,
        })
        return res
      }

      // Sub-pages use a two-request handoff: first persist the selected
      // pharmacy, then redirect to the real destination. Catalogue roots are
      // special: they remain network pages but carry an explicit pharmacy
      // filter so "browse this pharmacy" is visible rather than implicit.
      if (request.method === 'GET' || request.method === 'HEAD') {
        const destination = request.nextUrl.clone()
        destination.pathname = restPath
        destination.searchParams.delete('changePharmacy')
        if (restPath === '/medicines' || restPath === '/services') {
          destination.searchParams.set('pharmacy', slug)
        }
        const res = NextResponse.redirect(destination, 303)
        res.cookies.set('aether_pharmacy', slug, {
          path: '/',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30,
        })
        res.headers.set('Cache-Control', 'no-store')
        return res
      }

      // Preserve the existing rewrite behaviour for non-navigation requests.
      const url = request.nextUrl.clone()
      url.pathname = restPath
      requestHeaders.set('x-pharmacy-slug', slug)
      const res = NextResponse.rewrite(url, { request: { headers: requestHeaders } })
      res.cookies.set('aether_pharmacy', slug, {
        path: '/',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
      })
      return res
    }
  }

  // Once a visitor explicitly chooses a pharmacy, tenant-dependent actions and
  // detail rooms keep that context. Network catalogue roots deliberately do
  // not: users can return to /medicines or /services and compare everyone.
  if (
    usesRememberedPublicTenant(pathname) &&
    request.nextUrl.searchParams.get('changePharmacy') !== '1'
  ) {
    const remembered = request.cookies.get('aether_pharmacy')?.value?.trim().toLowerCase()
    if (validPublicSlug(remembered)) {
      requestHeaders.set('x-pharmacy-slug', remembered)
    }
  }

  if (pathname.startsWith('/platform') || pathname.startsWith('/api/platform')) {
    requestHeaders.set('x-platform-bypass', '1')
  }

  const staffPharmacy = request.cookies.get('aether_staff_pharmacy')?.value
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
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  if (pathname.startsWith('/caregiver/accept')) {
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  const claimCookie = request.cookies.get('aether_session_claim')?.value
  const sessionCookie = request.cookies.get('aether_session')?.value

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
