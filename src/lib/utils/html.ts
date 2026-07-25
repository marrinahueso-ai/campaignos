export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const SAFE_HREF_SCHEMES = new Set(["http:", "https:", "mailto:"]);

/**
 * Rejects dangerous URL schemes (`javascript:`, `data:`, `vbscript:`, etc.)
 * before a URL is written into an `href`/`src` attribute. Most mail clients
 * already strip `javascript:` links, but templates shouldn't rely on that —
 * this is defense in depth for any link built from org-authored or
 * user-supplied text (event links, artwork URLs, etc). Relative paths
 * (no scheme) are left untouched. Returns `#` for anything unsafe.
 */
export function sanitizeHrefUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "#";

  try {
    const parsed = new URL(trimmed, "https://sanitize-href.invalid");
    if (SAFE_HREF_SCHEMES.has(parsed.protocol)) {
      return trimmed;
    }
  } catch {
    return "#";
  }

  return "#";
}
