import {
  DEFAULT_SITE_URL,
  isLocalHostname,
  resolveSiteOrigin,
  resolveSiteUrlFromHeaders,
} from "@/lib/site/url";

export function buildInviteLoginUrl(
  inviteToken: string,
  siteOrigin: string,
): string {
  const url = new URL("/login", siteOrigin);
  url.searchParams.set("invite", inviteToken);
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
    const token = parsed.searchParams.get("invite");
    if (!token) {
      return inviteUrl;
    }
    return buildInviteLoginUrl(token, DEFAULT_SITE_URL);
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
