import { resolveSiteOrigin, resolveSiteUrlFromHeaders } from "@/lib/site/url";

export function buildInviteLoginUrl(
  inviteToken: string,
  siteOrigin: string,
): string {
  const url = new URL("/login", siteOrigin);
  url.searchParams.set("invite", inviteToken);
  return url.toString();
}

/** Resolve auth redirect origin from proxy headers (preferred) or Origin header. */
export function resolveAuthSiteOrigin(
  requestOrigin: string | null,
  host?: string | null,
  proto?: string | null,
): string {
  if (host) {
    return resolveSiteUrlFromHeaders(host, proto);
  }

  return resolveSiteOrigin(requestOrigin);
}
