import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSessionUserByToken, isStaff } from '@/app/lib/auth'

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  if (pathname.startsWith('/portal') || pathname.startsWith('/admin')) {
    const token = request.cookies.get("aether_session")?.value;
    
    if (!token) {
      return NextResponse.redirect(new URL(`/login?next=${pathname}`, request.url));
    }
    
    // proxy defaults to Node.js runtime in Next 16+ so we can use Prisma!
    const user = await getSessionUserByToken(token);
    
    if (!user) {
      return NextResponse.redirect(new URL(`/login?next=${pathname}`, request.url));
    }
    
    if (pathname.startsWith('/admin') && !isStaff(user.role)) {
      return NextResponse.redirect(new URL('/portal', request.url));
    }
    
    if (pathname.startsWith('/portal') && isStaff(user.role) && !user.customerId) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/portal/:path*', '/admin/:path*'],
}
