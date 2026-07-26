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

  return value || "#";
}
