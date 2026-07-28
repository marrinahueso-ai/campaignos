/** Public share route for Homepage Composer preview snapshots. */
export const HOMEPAGE_COMPOSER_SHARE_PATH_PREFIX = "/share/homepage";

export function homepageComposerSharePath(token: string): string {
  const safe = encodeURIComponent(token.trim());
  return `${HOMEPAGE_COMPOSER_SHARE_PATH_PREFIX}/${safe}`;
}

export function homepageComposerShareUrl(
  siteOrigin: string,
  token: string,
): string {
  const origin = siteOrigin.replace(/\/$/, "");
  return `${origin}${homepageComposerSharePath(token)}`;
}
