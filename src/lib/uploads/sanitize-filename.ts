/**
 * Sanitizes a client-supplied filename before it's interpolated into a
 * Supabase Storage object key (e.g. `${organizationId}/${Date.now()}-${name}`).
 *
 * Storage keys built this way must never let the raw filename through
 * unsanitized: `/` or `..` segments can nest the object into unexpected
 * "subfolders" inside the org's own prefix, and control characters or an
 * unbounded length can produce keys that break listings, signed-URL
 * generation, or downstream filename display. Since RLS already scopes
 * these buckets to `{organizationId}/...`, this isn't a cross-tenant
 * traversal risk — it's about keeping the stored key predictable and safe
 * to redisplay/re-download.
 */
export function sanitizeFilenameForStorage(
  rawFilename: string,
  fallback = "upload",
): string {
  const baseName = rawFilename.split(/[/\\]/).pop() ?? "";

  const cleaned = baseName
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.+/, "");

  const safe = cleaned.slice(0, 150);
  return safe || fallback;
}
