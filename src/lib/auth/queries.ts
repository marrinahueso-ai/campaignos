import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { AuthUserSummary } from "@/types/auth";

const AUTH_DISPLAY_NAME_KEYS = [
  "full_name",
  "name",
  "first_name",
  "display_name",
] as const;

export function resolveAuthUserDisplayName(
  userMetadata: Record<string, unknown> | undefined,
): string | null {
  if (!userMetadata) {
    return null;
  }

  for (const key of AUTH_DISPLAY_NAME_KEYS) {
    const value = userMetadata[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

export const getAuthUser = cache(async (): Promise<AuthUserSummary | null> => {
  const supabase = await createClient();
  // Local JWKS verification (ES256) — avoids a GET /auth/v1/user on every RSC
  // render. Middleware already refreshes near-expiry tokens; mutations that
  // need a server-confirmed user record still call auth.getUser() directly.
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const email = typeof claims?.email === "string" ? claims.email : null;
  const id = typeof claims?.sub === "string" ? claims.sub : null;

  if (error || !id || !email) {
    return null;
  }

  const userMetadata =
    claims?.user_metadata &&
    typeof claims.user_metadata === "object" &&
    !Array.isArray(claims.user_metadata)
      ? (claims.user_metadata as Record<string, unknown>)
      : undefined;

  return {
    id,
    email,
    displayName: resolveAuthUserDisplayName(userMetadata),
  };
});

export async function requireAuthUser(): Promise<AuthUserSummary> {
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Authentication required.");
  }

  return user;
}
