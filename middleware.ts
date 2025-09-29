import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from 'next/server';

// Define protected routes
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/create-agent',
  '/agent(.*)',
]);

// Define public routes that don't require authentication
const isPublicRoute = (pathname: string) => {
  return [
    '/',
    '/sign-in(.*)',
    '/sign-up(.*)',
    // Telegram webhook must be public (Telegram cannot provide your app session)
    '/api/telegram(.*)',
    '/api/webhooks(.*)',
    '/api/trpc(.*)',
    '/_next(.*)',
    '/favicon.ico',
    '/(assets|images|fonts|icons)(.*)',
  ].some(route => 
    pathname === route || 
    (route.endsWith('(.*)') && new RegExp(`^${route.replace('(.*)', '.*')}$`).test(pathname))
  );
};

// If Clerk environment variables are missing, bypass middleware to prevent 500s in production
const hasClerkEnv =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !!process.env.CLERK_SECRET_KEY;

export default (!hasClerkEnv
  ? function middleware() {
      return NextResponse.next();
    }
  : clerkMiddleware(async (auth, req) => {
      const { pathname } = req.nextUrl;

      // Skip middleware for public routes
      if (isPublicRoute(pathname)) {
        return NextResponse.next();
      }

      // Protected route handling
      if (isProtectedRoute(req)) {
        const { userId } = await auth();
        if (!userId) {
          const signInUrl = new URL('/sign-in', req.url);
          signInUrl.searchParams.set('redirect_url', pathname);
          return NextResponse.redirect(signInUrl);
        }
      }

      // Do not mutate headers or call getToken() here to remain Edge-compatible
      return NextResponse.next();
    }));

export const config = {
  matcher: [
    // Match all request paths except for the ones starting with:
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    // - files with extensions (e.g., .jpg, .css, .js)
    '/((?!_next/static|_next/image|favicon.ico|.*[.].*).*)',
  ],
};
