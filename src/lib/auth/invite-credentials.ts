import "server-only";

import { randomBytes } from "node:crypto";

import {
  createAdminClient,
  findAuthUserByEmail,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Readable temp password for invite emails (not a user-chosen secret). */
export function generateInviteTemporaryPassword(): string {
  // Example: Hr-a8f3k2m9q1
  return `Hr-${randomBytes(6).toString("base64url")}`;
}

/**
 * When true, invite emails include a temporary password and we provision
 * the Supabase auth user so Email & password works on first sign-in.
 *
 * Set TEAM_INVITE_INCLUDE_TEMP_PASSWORD=false to turn off (e.g. later prod).
 * Defaults to on outside production; set =true on Vercel while testing.
 */
export function shouldIncludeTempPasswordInInvite(): boolean {
  const raw = process.env.TEAM_INVITE_INCLUDE_TEMP_PASSWORD?.trim().toLowerCase();
  if (raw === "false" || raw === "0" || raw === "off") {
    return false;
  }
  if (raw === "true" || raw === "1" || raw === "on") {
    return true;
  }
  return process.env.NODE_ENV !== "production";
}

/**
 * Create or reset a Supabase auth user for an invited email.
 * Does not activate organization membership — claim still happens on sign-in.
 */
export async function ensureInvitedAuthCredentials(
  email: string,
): Promise<{ password: string } | { error: string }> {
  if (!isSupabaseAdminConfigured()) {
    return {
      error:
        "Could not add a temporary password (SUPABASE_SERVICE_ROLE_KEY missing). Share the invite link and use Magic link or Google.",
    };
  }

  const normalized = normalizeEmail(email);
  const password = generateInviteTemporaryPassword();
  const admin = createAdminClient();

  const created = await admin.auth.admin.createUser({
    email: normalized,
    password,
    email_confirm: true,
  });

  if (!created.error && created.data.user) {
    return { password };
  }

  const alreadyExists = created.error?.message.toLowerCase().includes("already");
  if (!alreadyExists) {
    return {
      error:
        created.error?.message ??
        "Could not create a sign-in account for this invite.",
    };
  }

  const existingUser = await findAuthUserByEmail(normalized);
  if (!existingUser) {
    return {
      error:
        created.error?.message ??
        "Could not find the existing account to reset the invite password.",
    };
  }

  const updated = await admin.auth.admin.updateUserById(existingUser.id, {
    password,
    email_confirm: true,
  });

  if (updated.error) {
    return { error: updated.error.message };
  }

  return { password };
}
