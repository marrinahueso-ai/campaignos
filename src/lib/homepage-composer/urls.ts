/**
 * Clean pasted / draft hrefs before export.
 * Common mistake: leaving the placeholder `#` so the field becomes `#https://…`
 */
export function normalizeHref(url: string | null | undefined): string {
  let value = (url ?? "").trim();
  if (!value) return "#";

  // "#https://…" or "#http://…"
  if (/^#https?:\/\//i.test(value)) {
    value = value.slice(1);
  }
  // "#www.example.com"
  if (/^#www\./i.test(value)) {
    value = `https://${value.slice(1)}`;
  }

  // Rich HTML exports render this value directly in an href. Escaping alone
  // does not make a `javascript:` (or other active) URL safe.
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return /^(https?:|mailto:)/i.test(value) ? value : "#";
  }

  return value || "#";
}
