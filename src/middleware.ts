import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/extension-dashboard',
  '/api/v1/keys(.*)',
  '/api/v1/stats(.*)',
  '/api/v1/logs(.*)',
  '/api/v1/usage(.*)',
  '/api/v1/analyzer(.*)',
  '/api/v1/extension(.*)',
]);

// Pages that require NO auth (public pages)
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/docs',
  '/optimizer',
  '/extension-auth',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)'],
  stableNoise: true,
};
