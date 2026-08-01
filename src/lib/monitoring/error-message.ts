/** Pure message extraction for integration error reporting (no Sentry import). */

export function extractErrorMessage(
  error: unknown,
  fallback?: string | null,
): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message;
    }
    if (typeof record.error === "string" && record.error.trim()) {
      return record.error;
    }
    // PostgREST / Supabase client errors are often plain objects with code + details.
    const parts = [
      typeof record.code === "string" ? record.code : null,
      typeof record.details === "string" ? record.details : null,
      typeof record.hint === "string" ? record.hint : null,
    ].filter((part): part is string => Boolean(part?.trim()));
    if (parts.length > 0) {
      return parts.join(" — ");
    }
  }
  return fallback?.trim() || "Unknown integration error";
}
