export function buildInviteLoginUrl(
  inviteToken: string,
  siteOrigin: string,
): string {
  const url = new URL("/login", siteOrigin);
  url.searchParams.set("invite", inviteToken);
  return url.toString();
}

export function resolveAuthSiteOrigin(
  requestOrigin: string | null,
): string {
  return (
    requestOrigin?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "http://localhost:3000"
  );
}
