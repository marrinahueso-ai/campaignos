import "server-only";

import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  buildSyntheticAuthEmail,
  generateUsernameFromFullName,
  isSyntheticAuthEmail,
  isValidUsernameFormat,
  nextUsernameCandidate,
  normalizeUsername,
  validateUsernameCandidate,
} from "@/lib/auth/usernames";

export async function usernameExists(username: string): Promise<boolean> {
  const normalized = normalizeUsername(username);
  if (!normalized) return false;

  if (isSupabaseAdminConfigured()) {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("auth_usernames")
      .select("user_id")
      .eq("username_normalized", normalized)
      .maybeSingle();
    if (error && error.code !== "PGRST116") {
      // Fall through to user client if table missing in local.
      console.error("usernameExists admin lookup failed:", error.message);
    } else {
      return Boolean(data?.user_id);
    }
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("auth_usernames")
    .select("user_id")
    .eq("username_normalized", normalized)
    .maybeSingle();
  return Boolean(data?.user_id);
}

export async function allocateAvailableUsername(
  preferred: string,
): Promise<{ username: string } | { error: string }> {
  const formatError = validateUsernameCandidate(preferred);
  if (formatError && !preferred.trim()) {
    return { error: formatError };
  }

  const base = formatError
    ? generateUsernameFromFullName(preferred)
    : normalizeUsername(preferred);

  for (let attempt = 1; attempt <= 40; attempt += 1) {
    const candidate = nextUsernameCandidate(base, attempt);
    if (!isValidUsernameFormat(candidate)) {
      continue;
    }
    const formatCheck = validateUsernameCandidate(candidate);
    if (formatCheck) {
      continue;
    }
    const taken = await usernameExists(candidate);
    if (!taken) {
      return { username: candidate };
    }
  }

  return { error: "Could not find an available username. Try another." };
}

export async function resolveAuthEmailForLoginIdentifier(
  identifier: string,
): Promise<string | null> {
  const trimmed = identifier.trim();
  if (!trimmed) return null;

  if (trimmed.includes("@")) {
    return trimmed.toLowerCase();
  }

  const normalized = normalizeUsername(trimmed);
  if (!normalized) return null;

  if (isSupabaseAdminConfigured()) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("auth_usernames")
      .select("auth_email")
      .eq("username_normalized", normalized)
      .maybeSingle();
    return data?.auth_email ?? null;
  }

  // Without service role, username login cannot resolve (RLS blocks lookup).
  return null;
}

export async function getUsernameForUserId(
  userId: string,
): Promise<string | null> {
  if (!userId) return null;

  if (isSupabaseAdminConfigured()) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("auth_usernames")
      .select("username")
      .eq("user_id", userId)
      .maybeSingle();
    return data?.username ?? null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("auth_usernames")
    .select("username")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.username ?? null;
}

export async function getUsernamesByUserIds(
  userIds: Array<string | null | undefined>,
): Promise<Record<string, string>> {
  const ids = Array.from(
    new Set(userIds.filter((id): id is string => Boolean(id))),
  );
  if (ids.length === 0) return {};

  const adminOk = isSupabaseAdminConfigured();
  const client = adminOk ? createAdminClient() : await createClient();
  const { data, error } = await client
    .from("auth_usernames")
    .select("user_id, username")
    .in("user_id", ids);

  if (error || !data) {
    return {};
  }

  const map: Record<string, string> = {};
  for (const row of data) {
    if (row.user_id && row.username) {
      map[row.user_id] = row.username;
    }
  }
  return map;
}

export async function insertAuthUsernameMapping(input: {
  userId: string;
  username: string;
  authEmail: string;
}): Promise<{ error: string } | { success: true }> {
  if (!isSupabaseAdminConfigured()) {
    return { error: "Account provisioning is not configured." };
  }

  const username = normalizeUsername(input.username);
  const formatError = validateUsernameCandidate(username);
  if (formatError) {
    return { error: formatError };
  }
  if (!isSyntheticAuthEmail(input.authEmail)) {
    return { error: "Internal auth identity is invalid." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("auth_usernames").insert({
    user_id: input.userId,
    username,
    auth_email: input.authEmail.toLowerCase(),
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "That username isn’t available." };
    }
    return { error: error.message };
  }

  return { success: true };
}

export { buildSyntheticAuthEmail, generateUsernameFromFullName };
