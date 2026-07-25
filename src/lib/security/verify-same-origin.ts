import { resolveSiteOrigin } from "@/lib/site/url";

/**
 * CSRF guard for cookie-authenticated API routes: browsers always send an
 * `Origin` header on cross-site POST/PUT/PATCH/DELETE fetches/forms, and
 * that header can't be spoofed by page script or a plain HTML form. Reject
 * the request unless it matches the app's own origin.
 */
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  // No Origin header at all (e.g. some same-site navigations, non-browser
  // clients using a bearer token elsewhere) — don't block those; this check
  // exists to catch cross-site browser requests, which always send Origin.
  if (!origin) {
    return true;
  }

  const requestOrigin = new URL(request.url).origin;
  const allowedOrigin = resolveSiteOrigin(requestOrigin);
  return origin === requestOrigin || origin === allowedOrigin;
}
