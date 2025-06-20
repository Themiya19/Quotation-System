import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const userEmail = request.cookies.get('userEmail')?.value;
  const accessType = request.cookies.get('accessType')?.value;
  const company = request.cookies.get('company')?.value;
  const pathname = request.nextUrl.pathname;

  // 1. Skip middleware for API routes, static files, Next.js internal files, and public assets
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/public/') ||
    (pathname.includes('.') && !pathname.endsWith('/')) // Catches files like favicon.ico, image.png
  ) {
    return NextResponse.next();
  }

  // 2. Handle users who are considered logged in (have userEmail and accessType)
  if (userEmail && accessType) {
    // 2a. Special handling for external users: they MUST have a company cookie.
    if (accessType === 'external' && !company) {
      // Invalid session for external user if company is missing.
      // Clear cookies. If already on login, allow to proceed to break the loop, otherwise redirect to login.
      let responseToClient: NextResponse;
      if (pathname === '/login') {
        // If already on the login page, allow it to render.
        // Cookies will be cleared, effectively prompting for a fresh login.
        responseToClient = NextResponse.next();
      } else {
        // If on any other page, redirect to login.
        responseToClient = NextResponse.redirect(new URL('/login', request.url));
      }

      responseToClient.cookies.delete('userEmail');
      responseToClient.cookies.delete('accessType');
      responseToClient.cookies.delete('company');
      responseToClient.cookies.delete('externalType');
      // Add any other external-specific cookies that should be cleared here
      return responseToClient;
    }

    // 2b. If a logged-in user (with a valid session state) is on the login page, redirect them away.
    if (pathname === '/login') {
      if (accessType === 'external') {
        return NextResponse.redirect(new URL('/quotations/external', request.url));
      } else if (accessType === 'internal') {
        // Internal users redirect to /quotations.
        // Client-side logic on / (HomePage) or /quotations will handle further specific redirects (e.g., to /quotations/analytics).
        return NextResponse.redirect(new URL('/quotations', request.url));
      }
      // Fallback for any other accessType, though it should be 'internal' or 'external'.
      return NextResponse.redirect(new URL('/', request.url));
    }

    // 2c. Access control for external users (already validated they have a company cookie).
    // They should only access /quotations/external/* and API routes (already skipped in step 1).
    if (accessType === 'external') {
      if (!pathname.startsWith('/quotations/external')) {
        return NextResponse.redirect(new URL('/quotations/external', request.url));
      }
    }

    // 2d. Access control for internal users.
    // Example: Prevent internal users from accessing external-specific paths.
    if (accessType === 'internal') {
      if (pathname.startsWith('/quotations/external')) {
        return NextResponse.redirect(new URL('/quotations', request.url));
      }
    }

    // If none of the above redirect conditions for logged-in users are met, allow access.
    return NextResponse.next();
  }

  // 3. Handle users who are NOT logged in (no userEmail or no accessType).
  // If they are not on the login page, redirect them to login.
  // if (pathname !== '/login') {
  //   return NextResponse.redirect(new URL('/login', request.url));
  // }

  // 4. If user is not logged in AND is on the login page, allow access.
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder (files like images, svgs, etc.)
     * This also implicitly excludes files with extensions within public by the check in step 1.
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public/).*)',
  ],
};