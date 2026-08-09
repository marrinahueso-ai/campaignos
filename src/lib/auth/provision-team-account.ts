import "server-only";

import { createOrganizationMembership } from "@/lib/auth/membership-mutations";
import type { CampaignRole } from "@/lib/auth/campaign-roles";
import {
  buildSyntheticAuthEmail,
  insertAuthUsernameMapping,
} from "@/lib/auth/username-queries";
import {
  normalizeUsername,
  validateUsernameCandidate,
} from "@/lib/auth/usernames";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function activateOrganizationMembership(input: {
  organizationId: string;
  userId: string;
  email: string | null;
  displayName?: string | null;
  organizationRoleId?: string | null;
  campaignRole: CampaignRole;
  accessTemplateId?: string | null;
}): Promise<{ error: string } | { success: true; membershipId: string }> {
  const supabase = await createClient();
  const email = input.email ? normalizeEmail(input.email) : null;
  const now = new Date().toISOString();

  // Username Create Login seats have no contact email (NULL). Postgres UNIQUE
  // allows multiple NULLs per org; never insert "" or we collide on (org, email).
  if (!email) {
    const { data, error } = await supabase
      .from("organization_users")
      .insert({
        organization_id: input.organizationId,
        user_id: input.userId,
        email: null,
        display_name: input.displayName ?? null,
        organization_role_id: input.organizationRoleId ?? null,
        campaign_role: input.campaignRole,
        access_template_id: input.accessTemplateId ?? input.campaignRole,
        status: "active",
        joined_at: now,
      })
      .select("id")
      .single();

    if (error) {
      return { error: error.message };
    }
    return { success: true, membershipId: data.id };
  }

  const { data: existing } = await supabase
    .from("organization_users")
    .select("id, status")
    .eq("organization_id", input.organizationId)
    .ilike("email", email)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("organization_users")
      .update({
        user_id: input.userId,
        status: "active",
        organization_role_id: input.organizationRoleId ?? null,
        campaign_role: input.campaignRole,
        access_template_id: input.accessTemplateId ?? input.campaignRole,
        display_name: input.displayName ?? undefined,
        joined_at: now,
        invite_token: null,
      })
      .eq("id", existing.id);

    if (error) {
      return { error: error.message };
    }

    return { success: true, membershipId: existing.id };
  }

  const created = await createOrganizationMembership({
    organizationId: input.organizationId,
    userId: input.userId,
    email,
    organizationRoleId: input.organizationRoleId,
    campaignRole: input.campaignRole,
    status: "active",
  });

  if ("error" in created) {
    return { error: created.error };
  }

  if (input.displayName || input.accessTemplateId) {
    await supabase
      .from("organization_users")
      .update({
        display_name: input.displayName ?? null,
        access_template_id: input.accessTemplateId ?? input.campaignRole,
      })
      .eq("id", created.id);
  }

  return { success: true, membershipId: created.id };
}

/** Email+password provision (legacy Create account / invite-adjacent). */
export async function provisionTeamMemberAccount(input: {
  organizationId: string;
  email: string;
  password: string;
  displayName?: string | null;
  organizationRoleId?: string | null;
  campaignRole: CampaignRole;
  accessTemplateId?: string | null;
}): Promise<
  { email: string; membershipId: string } | { error: string }
> {
  if (!isSupabaseAdminConfigured()) {
    return {
      error:
        "Account provisioning is not configured. Add SUPABASE_SERVICE_ROLE_KEY to .env.local.",
    };
  }

  const email = normalizeEmail(input.email);
  if (input.password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const admin = createAdminClient();

  const created = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    app_metadata: { must_change_password: true },
  });

  if (created.error) {
    const alreadyExists = created.error.message
      .toLowerCase()
      .includes("already");

    if (!alreadyExists) {
      return { error: created.error.message };
    }

    return {
      error:
        "An account already exists for this email. Use Invite instead so they can join with their own credentials, or ask them to sign in directly.",
    };
  }

  const userId = created.data.user.id;
  if (!userId) {
    return { error: "Could not create the sign-in account." };
  }

  const membership = await activateOrganizationMembership({
    organizationId: input.organizationId,
    userId,
    email,
    displayName: input.displayName,
    organizationRoleId: input.organizationRoleId,
    campaignRole: input.campaignRole,
    accessTemplateId: input.accessTemplateId,
  });

  if ("error" in membership) {
    return { error: membership.error };
  }

  return { email, membershipId: membership.membershipId };
}

/**
 * Username Create Login — no member email required.
 * Uses internal synthetic Auth email + auth_usernames mapping.
 */
export async function provisionUsernameTeamMemberAccount(input: {
  organizationId: string;
  username: string;
  password: string;
  displayName: string;
  organizationRoleId?: string | null;
  campaignRole: CampaignRole;
  accessTemplateId?: string | null;
}): Promise<
  | { username: string; membershipId: string; userId: string }
  | { error: string }
> {
  if (!isSupabaseAdminConfigured()) {
    return {
      error:
        "Account provisioning is not configured. Add SUPABASE_SERVICE_ROLE_KEY to .env.local.",
    };
  }

  const username = normalizeUsername(input.username);
  const formatError = validateUsernameCandidate(username);
  if (formatError) {
    return { error: formatError };
  }

  if (input.password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const displayName = input.displayName.trim();
  if (!displayName) {
    return { error: "Full name is required." };
  }

  const authEmail = buildSyntheticAuthEmail();
  const admin = createAdminClient();

  const created = await admin.auth.admin.createUser({
    email: authEmail,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: displayName,
      display_name: displayName,
      login_username: username,
    },
    app_metadata: {
      must_change_password: true,
      username_login: true,
    },
  });

  if (created.error) {
    return { error: created.error.message };
  }

  const userId = created.data.user.id;
  if (!userId) {
    return { error: "Could not create the sign-in account." };
  }

  const mapped = await insertAuthUsernameMapping({
    userId,
    username,
    authEmail,
  });

  if ("error" in mapped) {
    // Best-effort cleanup so we don't leave orphan Auth users without username.
    await admin.auth.admin.deleteUser(userId);
    return { error: mapped.error };
  }

  const membership = await activateOrganizationMembership({
    organizationId: input.organizationId,
    userId,
    email: null,
    displayName,
    organizationRoleId: input.organizationRoleId,
    campaignRole: input.campaignRole,
    accessTemplateId: input.accessTemplateId,
  });

  if ("error" in membership) {
    await admin.from("auth_usernames").delete().eq("user_id", userId);
    await admin.auth.admin.deleteUser(userId);
    return { error: membership.error };
  }

  return {
    username,
    membershipId: membership.membershipId,
    userId,
  };
}

export async function adminResetUsernamePassword(input: {
  userId: string;
  password: string;
}): Promise<{ error: string } | { success: true }> {
  if (!isSupabaseAdminConfigured()) {
    return { error: "Account provisioning is not configured." };
  }
  if (input.password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const admin = createAdminClient();
  const { data: mapping } = await admin
    .from("auth_usernames")
    .select("user_id")
    .eq("user_id", input.userId)
    .maybeSingle();

  if (!mapping) {
    return {
      error: "This member doesn’t use a username login.",
    };
  }

  const { error } = await admin.auth.admin.updateUserById(input.userId, {
    password: input.password,
    app_metadata: {
      must_change_password: true,
      username_login: true,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Force re-auth with the new temporary password.
  const { revokeUserSessions } = await import("@/lib/auth/revoke-sessions");
  await revokeUserSessions(input.userId);

  return { success: true };
}
