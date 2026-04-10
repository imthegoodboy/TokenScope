import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  // Proxy is authenticated by proxy_id in the URL; do not require Clerk for LLM clients.
  '/api/v1/keys(.*)',
  '/api/v1/stats(.*)',
  '/api/v1/logs(.*)',
  '/api/v1/usage(.*)',
  '/api/v1/analyzer(.*)',
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
