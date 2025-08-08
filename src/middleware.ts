
import { type NextRequest, NextResponse } from 'next/server';
import { auth } from './lib/firebase-admin';

export async function middleware(request: NextRequest) {
  const session = request.cookies.get('__session')?.value || '';

  // If no session cookie, redirect to login for protected routes
  if (!session) {
    if (isProtectedRoute(request.nextUrl.pathname)) {
        return NextResponse.redirect(new URL('/auth/signin', request.url));
    }
    return NextResponse.next();
  }
  
  // Verify the session cookie
  try {
    const decodedToken = await auth.verifySessionCookie(session, true);
    request.headers.set('X-User-ID', decodedToken.uid);
    request.headers.set('X-User-Role', decodedToken.role || 'User');
    
    // If user is on login page, redirect them away
    if (request.nextUrl.pathname.startsWith('/auth/signin') || request.nextUrl.pathname.startsWith('/auth/signup')) {
        const role = decodedToken.role;
        let redirectUrl = '/';
        if (role === 'Super Admin') redirectUrl = '/admin/dashboard';
        else if (role === 'DispensaryOwner') redirectUrl = '/dispensary-admin/dashboard';
        else redirectUrl = '/dashboard/leaf';
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

  } catch (err) {
    // Session cookie is invalid. Clear it and redirect to login for protected routes.
    const response = NextResponse.next();
    response.cookies.delete('__session');

    if (isProtectedRoute(request.nextUrl.pathname)) {
        const loginUrl = new URL('/auth/signin', request.url);
        return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  return NextResponse.next();
}

function isProtectedRoute(pathname: string): boolean {
    const protectedPaths = ['/admin', '/dashboard', '/dispensary-admin'];
    return protectedPaths.some(path => pathname.startsWith(path));
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
