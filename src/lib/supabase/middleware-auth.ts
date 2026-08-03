/**
 * Pure helpers for mapping Supabase JWT claims into the minimal user shape
 * middleware needs for gating (id + app_metadata flags).
 *
 * Prefer `auth.getClaims()` over `auth.getUser()` in middleware: with
 * asymmetric JWT signing keys (ES256/RS256), getClaims verifies the access
 * token locally against the project's JWKS and only hits Auth when a refresh
 * is actually required. getUser() always calls GET /auth/v1/user.
 */

export type MiddlewareAuthUser = {
  id: string;
  email?: string;
  app_metadata?: Record<string, unknown>;
};

export function claimsToMiddlewareUser(
  claims: Record<string, unknown> | null | undefined,
): MiddlewareAuthUser | null {
  if (!claims) return null;
  const id = typeof claims.sub === "string" ? claims.sub.trim() : "";
  if (!id) return null;

  const email = typeof claims.email === "string" ? claims.email : undefined;
  const rawMeta = claims.app_metadata;
  const app_metadata =
    rawMeta && typeof rawMeta === "object" && !Array.isArray(rawMeta)
      ? (rawMeta as Record<string, unknown>)
      : undefined;

  return { id, email, app_metadata };
}

/** True when an Auth SDK error is a transient rate-limit / overload response. */
export function isAuthRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const status = "status" in error ? Number(error.status) : NaN;
  const code =
    "code" in error && typeof error.code === "string" ? error.code : "";
  const message =
    "message" in error && typeof error.message === "string"
      ? error.message
      : "";
  return (
    status === 429 ||
    code === "over_request_rate_limit" ||
    /rate limit/i.test(message)
  );
}
