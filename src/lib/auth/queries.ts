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
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user?.email) {
    return null;
  }

  return {
    id: data.user.id,
    email: data.user.email,
    displayName: resolveAuthUserDisplayName(data.user.user_metadata),
  };
});

export async function requireAuthUser(): Promise<AuthUserSummary> {
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Authentication required.");
  }

  return user;
}
