import "server-only";

import {
  createAdminClient,
  findAuthUserByEmail,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const MUST_CHANGE_PASSWORD_KEY = "must_change_password";

/**
 * Create or update the invited member's auth account with a password they chose.
 * Email is treated as verified because they opened a secret, expiring invite link.
 */
export async function createInvitedMemberAccount(input: {
  email: string;
  password: string;
}): Promise<{ userId: string } | { error: string }> {
  if (!isSupabaseAdminConfigured()) {
    return {
      error:
        "Account setup is not configured. Ask your admin to add SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  if (input.password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const email = normalizeEmail(input.email);
  const admin = createAdminClient();

  const created = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    app_metadata: {
      [MUST_CHANGE_PASSWORD_KEY]: false,
    },
  });

  if (!created.error && created.data.user) {
    return { userId: created.data.user.id };
  }

  const alreadyExists = created.error?.message.toLowerCase().includes("already");
  if (!alreadyExists) {
    return {
      error:
        created.error?.message ??
        "Could not create your account. Try again or ask your admin to resend the invite.",
    };
  }

  // Invite links are secret + expiring — allow setting/resetting password on an
  // existing auth user (e.g. Google-only accounts needing local email login).
  const existing = await findAuthUserByEmail(email);
  if (!existing) {
    return {
      error:
        "An account already exists for this email, but it could not be updated. Sign in instead or ask your admin to resend the invite.",
    };
  }

  const updated = await admin.auth.admin.updateUserById(existing.id, {
    password: input.password,
    email_confirm: true,
    app_metadata: {
      ...existing.app_metadata,
      [MUST_CHANGE_PASSWORD_KEY]: false,
    },
  });

  if (updated.error || !updated.data.user) {
    return {
      error:
        updated.error?.message ??
        "Could not update your password. Try signing in instead.",
    };
  }

  return { userId: updated.data.user.id };
}

/** Mark manually provisioned accounts so first login requires a password change. */
export async function markMustChangePassword(
  userId: string,
): Promise<{ error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { error: "Admin client not configured." };
  }

  const admin = createAdminClient();
  const { data, error: getError } = await admin.auth.admin.getUserById(userId);
  if (getError || !data.user) {
    return { error: getError?.message ?? "User not found." };
  }

  const { error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...data.user.app_metadata,
      [MUST_CHANGE_PASSWORD_KEY]: true,
    },
  });

  return error ? { error: error.message } : {};
}

export async function clearMustChangePassword(
  userId: string,
): Promise<{ error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { error: "Admin client not configured." };
  }

  const admin = createAdminClient();
  const { data, error: getError } = await admin.auth.admin.getUserById(userId);
  if (getError || !data.user) {
    return { error: getError?.message ?? "User not found." };
  }

  const { error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...data.user.app_metadata,
      [MUST_CHANGE_PASSWORD_KEY]: false,
    },
  });

  return error ? { error: error.message } : {};
}

export function userMustChangePassword(user: {
  app_metadata?: Record<string, unknown> | null;
}): boolean {
  return user.app_metadata?.[MUST_CHANGE_PASSWORD_KEY] === true;
}

export async function authUserExistsForEmail(email: string): Promise<boolean> {
  if (!isSupabaseAdminConfigured()) {
    return false;
  }
  const existing = await findAuthUserByEmail(normalizeEmail(email));
  return Boolean(existing);
}
