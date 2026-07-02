import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { AuthUserSummary } from "@/types/auth";

export const getAuthUser = cache(async (): Promise<AuthUserSummary | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user?.email) {
    return null;
  }

  return {
    id: data.user.id,
    email: data.user.email,
  };
});

export async function requireAuthUser(): Promise<AuthUserSummary> {
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Authentication required.");
  }

  return user;
}
