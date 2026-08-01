/**
 * Detect Next.js server-action / RSC transport failures that are not product bugs.
 * Common when Vercel returns 502/504 HTML instead of a flight payload, or the
 * browser aborts the in-flight POST after navigation.
 */

function errorText(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name} ${error.message}`;
  }
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "");
  }
  return "";
}

/** True when a server action failed due to network / gateway / aborted fetch. */
export function isServerActionTransportError(error: unknown): boolean {
  if (
    typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    error.name === "AbortError"
  ) {
    return true;
  }

  if (error instanceof Error && error.name === "AbortError") {
    return true;
  }

  const message = errorText(error);
  return (
    /unexpected response was received from the server/i.test(message) ||
    /failed to fetch|networkerror|load failed|aborted/i.test(message) ||
    /\b(502|503|504)\b/.test(message) ||
    /gateway time-?out|bad gateway|service unavailable/i.test(message)
  );
}
