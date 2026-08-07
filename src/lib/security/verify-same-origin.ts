import { resolveSiteOrigin } from "@/lib/site/url";

/**
 * CSRF guard for cookie-authenticated API routes.
 *
 * Browsers always send `Origin` on cross-site POST/PUT/PATCH/DELETE, and send
 * `Sec-Fetch-Site: cross-site` on modern cross-site fetches. Reject those.
 * Same-origin browser requests and trusted same-site navigations are allowed.
 */
export function isSameOriginRequest(request: Request): boolean {
  const secFetchSite = (request.headers.get("sec-fetch-site") || "")
    .trim()
    .toLowerCase();
  if (secFetchSite === "cross-site") {
    return false;
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    // No Origin: allow only when the browser declares same-origin/same-site,
    // or when Sec-Fetch-Site is absent (non-browser / older clients). Mutating
    // cookie APIs should prefer an explicit Origin when available.
    if (
      secFetchSite === "same-origin" ||
      secFetchSite === "same-site" ||
      secFetchSite === "none" ||
      secFetchSite === ""
    ) {
      return true;
    }
    return false;
  }

  const requestOrigin = new URL(request.url).origin;
  const allowedOrigin = resolveSiteOrigin(requestOrigin);
  return origin === requestOrigin || origin === allowedOrigin;
}
