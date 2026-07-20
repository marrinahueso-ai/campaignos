import "server-only";

import { markMustChangePassword } from "@/lib/auth/invite-credentials";
import { createOrganizationMembership } from "@/lib/auth/membership-mutations";
import type { CampaignRole } from "@/lib/auth/campaign-roles";
import {
  createAdminClient,
  findAuthUserByEmail,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function activateOrganizationMembership(input: {
  organizationId: string;
  userId: string;
  email: string;
  organizationRoleId?: string | null;
  campaignRole: CampaignRole;
}): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();
  const email = normalizeEmail(input.email);

  const { data: existing } = await supabase
    .from("organization_users")
    .select("id, status")
    .eq("organization_id", input.organizationId)
    .ilike("email", email)
    .maybeSingle();

  const now = new Date().toISOString();

  if (existing) {
    const { error } = await supabase
      .from("organization_users")
      .update({
        user_id: input.userId,
        status: "active",
        organization_role_id: input.organizationRoleId ?? null,
        campaign_role: input.campaignRole,
        joined_at: now,
        invite_token: null,
      })
      .eq("id", existing.id);

    if (error) {
      return { error: error.message };
    }

    return { success: true };
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

  return { success: true };
}

export async function provisionTeamMemberAccount(input: {
  organizationId: string;
  email: string;
  password: string;
  organizationRoleId?: string | null;
  campaignRole: CampaignRole;
}): Promise<{ email: string } | { error: string }> {
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
  let userId: string | null = null;

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

    const existingUser = await findAuthUserByEmail(email);
    if (!existingUser) {
      return { error: created.error.message };
    }

    const updated = await admin.auth.admin.updateUserById(existingUser.id, {
      password: input.password,
      email_confirm: true,
    });

    if (updated.error) {
      return { error: updated.error.message };
    }

    userId = existingUser.id;
    await markMustChangePassword(userId);
  } else {
    userId = created.data.user.id;
  }

  if (!userId) {
    return { error: "Could not create the sign-in account." };
  }

  const membership = await activateOrganizationMembership({
    organizationId: input.organizationId,
    userId,
    email,
    organizationRoleId: input.organizationRoleId,
    campaignRole: input.campaignRole,
  });

  if ("error" in membership) {
    return { error: membership.error };
  }

  return { email };
}
