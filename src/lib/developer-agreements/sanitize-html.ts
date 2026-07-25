import DOMPurify from "isomorphic-dompurify";

// No `server-only` guard here (unlike its callers) so this stays unit
// testable with the plain Node test runner. isomorphic-dompurify resolves
// to the browser DOMPurify build if this ever ends up in a client bundle,
// so there's no server-secret leak risk in dropping the guard.

/**
 * Agreement body HTML is authored by Owners (paste / .docx / .html upload)
 * and then rendered with `dangerouslySetInnerHTML` to every developer who
 * views/signs the agreement, and re-served inline as `text/html` from the
 * download route. Strip scripts/event handlers so a compromised or careless
 * Owner account can't stored-XSS every signer.
 */
export function sanitizeAgreementHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form"],
    FORBID_ATTR: ["srcdoc"],
  });
}
