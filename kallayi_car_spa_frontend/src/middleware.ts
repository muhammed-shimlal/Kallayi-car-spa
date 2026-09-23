import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authToken = request.cookies.get('auth_token')?.value;

  // If user is already authenticated and visits /login or /signup
  if (authToken && (pathname === '/login' || pathname === '/signup')) {
    // Check if role cookie exists
    const userRole = request.cookies.get('user_role')?.value?.toUpperCase();
    if (userRole === 'ADMIN' || userRole === 'MANAGER') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    if (userRole === 'STAFF' || userRole === 'WASHER' || userRole === 'TECHNICIAN' || userRole === 'DRIVER') {
      return NextResponse.redirect(new URL('/staff/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
