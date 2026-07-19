import {
  DEFAULT_SITE_URL,
  isLocalHostname,
  resolveSiteOrigin,
  resolveSiteUrlFromHeaders,
} from "@/lib/site/url";

/** Secure invite accept URL — member sets their own password here. */
export function buildInviteLoginUrl(
  inviteToken: string,
  siteOrigin: string,
): string {
  const url = new URL(`/invite/${encodeURIComponent(inviteToken)}`, siteOrigin);
  return url.toString();
}

/**
 * Email clients cannot open localhost invite links. Rewrite local origins to
 * the public Hey Ralli site while keeping the invite token.
 */
export function toPublicInviteUrl(inviteUrl: string): string {
  try {
    const parsed = new URL(inviteUrl);
    if (!isLocalHostname(parsed.hostname)) {
      return inviteUrl;
    }

    const pathMatch = parsed.pathname.match(/^\/invite\/([^/]+)\/?$/);
    if (pathMatch?.[1]) {
      return buildInviteLoginUrl(decodeURIComponent(pathMatch[1]), DEFAULT_SITE_URL);
    }

    const token = parsed.searchParams.get("invite");
    if (token) {
      return buildInviteLoginUrl(token, DEFAULT_SITE_URL);
    }

    return inviteUrl;
  } catch {
    return inviteUrl;
  }
}

/** Resolve auth redirect origin from proxy headers (preferred) or Origin header. */
export function resolveAuthSiteOrigin(
  requestOrigin: string | null,
  host?: string | null,
  proto?: string | null,
): string {
  // Prefer the browser Origin when it is local. Otherwise OAuth can bounce
  // localhost → heyralli.com when Site URL / forwarded host points at prod.
  if (requestOrigin?.trim()) {
    try {
      const originUrl = new URL(requestOrigin.trim());
      if (isLocalHostname(originUrl.hostname)) {
        return resolveSiteOrigin(requestOrigin);
      }
    } catch {
      // fall through
    }
  }

  if (host) {
    const hostname = host.split(":")[0];
    if (isLocalHostname(hostname)) {
      // Local Next never serves HTTPS in this project — keep OAuth on http://localhost.
      return resolveSiteUrlFromHeaders(host, "http");
    }
    return resolveSiteUrlFromHeaders(host, proto);
  }

  return resolveSiteOrigin(requestOrigin);
}

/**
 * Email clients cannot open localhost auth redirects. Prefer the public site
 * origin when building magic-link / setup URLs that will be emailed.
 */
export function resolvePublicEmailAuthOrigin(
  requestOrigin: string | null,
  host?: string | null,
  proto?: string | null,
): string {
  const origin = resolveAuthSiteOrigin(requestOrigin, host, proto);
  try {
    if (isLocalHostname(new URL(origin).hostname)) {
      return DEFAULT_SITE_URL;
    }
  } catch {
    // keep resolved origin
  }
  return origin;
}
