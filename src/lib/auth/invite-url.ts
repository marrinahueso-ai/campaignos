import { resolveSiteOrigin } from "@/lib/site/url";

export function buildInviteLoginUrl(
  inviteToken: string,
  siteOrigin: string,
): string {
  const url = new URL("/login", siteOrigin);
  url.searchParams.set("invite", inviteToken);
  return url.toString();
}

/** @deprecated Use resolveSiteOrigin from @/lib/site/url — kept for existing imports. */
export function resolveAuthSiteOrigin(
  requestOrigin: string | null,
): string {
  return resolveSiteOrigin(requestOrigin);
}
