/**
 * Copies text to the clipboard, falling back to a hidden-textarea +
 * `document.execCommand("copy")` when the async Clipboard API is
 * unavailable, blocked by permissions, or requires a secure-context /
 * user-gesture guarantee that isn't present. Safari in particular is
 * stricter than Chrome about `navigator.clipboard` outside a direct
 * click handler, so relying on it alone silently fails there.
 *
 * Throws if both paths fail so callers can keep their existing
 * try/catch UX (e.g. "Could not copy — select and copy manually.").
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to the legacy execCommand path below.
    }
  }

  if (typeof document === "undefined") {
    throw new Error("Clipboard is unavailable in this environment.");
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }

  if (!copied) {
    throw new Error("Copy to clipboard failed.");
  }
}
