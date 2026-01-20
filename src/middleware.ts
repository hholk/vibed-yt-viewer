import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function isStaticAssetPath(pathname: string): boolean {
  if (pathname.startsWith('/_next/')) return true;
  if (pathname === '/favicon.ico') return true;
  // Public assets + build artifacts. Keep this generous to avoid blocking hydration.
  return /\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css|map|json|webmanifest|txt|xml)$/i.test(pathname);
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Block accidental requests for internal build output paths.
  // These files are not meant to be fetched by the browser, and attempts can spam the server with ENOENT logs.
  if (pathname.startsWith('/_next/server/')) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // Never protect Next.js assets / static files.
  // If these are blocked, the app can't hydrate and the UI will appear broken.
  if (isStaticAssetPath(pathname)) {
    return NextResponse.next();
  }

  // Allow access to login page, auth API, and offline sync API
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/offline') ||
    pathname === '/sw.js' ||
    pathname === '/idb.min.js' ||
    pathname === '/manifest.json' ||
    pathname === '/manifest.webmanifest'
  ) {
    return NextResponse.next();
  }

  // Check for authentication cookie
  const authCookie = request.cookies.get('yt-viewer-auth');

  if (!authCookie || authCookie.value !== 'authenticated') {
    // Redirect to login page
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - common static asset extensions (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
