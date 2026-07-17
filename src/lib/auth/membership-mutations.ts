import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import {
  type CampaignRole,
  isCampaignRole,
} from "@/lib/auth/campaign-roles";
import { computeInviteExpiresAt } from "@/lib/auth/invite-constants";
import { inferDefaultCampaignRole } from "@/lib/auth/infer-campaign-role";
import type { OrganizationRoleKind } from "@/types/organization-workspace";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function createOrganizationMembership(input: {
  organizationId: string;
  userId: string;
  email: string;
  organizationRoleId?: string | null;
  campaignRole?: CampaignRole;
  status?: "active" | "invited";
}): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const email = normalizeEmail(input.email);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("organization_users")
    .insert({
      organization_id: input.organizationId,
      user_id: input.userId,
      email,
      organization_role_id: input.organizationRoleId ?? null,
      campaign_role: input.campaignRole ?? "admin",
      status: input.status ?? "active",
      joined_at: input.status === "invited" ? null : now,
      invited_at: input.status === "invited" ? now : null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "This email is already on the team." };
    }
    return { error: error.message };
  }

  return { id: data.id };
}

export async function inviteOrganizationUser(input: {
  organizationId: string;
  email: string;
  displayName?: string | null;
  organizationRoleId?: string | null;
  organizationMemberId?: string | null;
  committeeId?: string | null;
  inviteMessage?: string | null;
  campaignRole?: CampaignRole;
  /** Custom or system template id shown on People; auth still uses campaignRole. */
  accessTemplateId?: string | null;
  invitedByUserId: string;
}): Promise<{ id: string; inviteToken: string } | { error: string }> {
  const supabase = await createClient();
  const email = normalizeEmail(input.email);
  const inviteToken = randomUUID();
  const now = new Date().toISOString();
  const displayName = input.displayName?.trim() || null;
  const inviteMessage = input.inviteMessage?.trim() || null;
  const organizationMemberId = input.organizationMemberId ?? null;

  if (organizationMemberId) {
    const { data: linkedElsewhere } = await supabase
      .from("organization_users")
      .select("id")
      .eq("organization_member_id", organizationMemberId)
      .neq("email", email)
      .maybeSingle();

    if (linkedElsewhere) {
      return {
        error: "This roster person is already linked to another login member.",
      };
    }
  }

  const { data: existing } = await supabase
    .from("organization_users")
    .select("id, status, organization_member_id")
    .eq("organization_id", input.organizationId)
    .ilike("email", email)
    .maybeSingle();

  if (existing?.status === "active") {
    if (
      organizationMemberId &&
      !existing.organization_member_id
    ) {
      const { error: linkError } = await supabase
        .from("organization_users")
        .update({
          organization_member_id: organizationMemberId,
          display_name: displayName ?? undefined,
          organization_role_id: input.organizationRoleId ?? undefined,
          committee_id: input.committeeId ?? undefined,
          campaign_role: input.campaignRole ?? undefined,
        })
        .eq("id", existing.id);
      if (linkError) {
        return { error: linkError.message };
      }
      return { error: "This person is already an active team member." };
    }
    return { error: "This person is already an active team member." };
  }

  if (
    existing?.organization_member_id &&
    organizationMemberId &&
    existing.organization_member_id !== organizationMemberId
  ) {
    return {
      error: "This email is already linked to a different roster person.",
    };
  }

  const payload = {
    organization_role_id: input.organizationRoleId ?? null,
    organization_member_id: organizationMemberId,
    committee_id: input.committeeId ?? null,
    display_name: displayName,
    invite_message: inviteMessage,
    campaign_role: input.campaignRole ?? "contributor",
    access_template_id:
      input.accessTemplateId ?? input.campaignRole ?? "contributor",
    status: "invited" as const,
    invite_token: inviteToken,
    invite_expires_at: computeInviteExpiresAt(new Date(now)),
    invited_by_user_id: input.invitedByUserId,
    invited_at: now,
    user_id: null,
    joined_at: null,
  };

  if (existing) {
    const { error } = await supabase
      .from("organization_users")
      .update({
        ...payload,
        organization_member_id:
          organizationMemberId ?? existing.organization_member_id ?? null,
      })
      .eq("id", existing.id);

    if (error) {
      return { error: error.message };
    }

    return { id: existing.id, inviteToken };
  }

  const { data, error } = await supabase
    .from("organization_users")
    .insert({
      organization_id: input.organizationId,
      email,
      ...payload,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  return { id: data.id, inviteToken };
}

export async function claimOrganizationAdminAccess(input: {
  organizationId: string;
  userId: string;
  email: string;
}): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from("organization_users")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", input.organizationId)
    .eq("status", "active");

  if (countError) {
    return { error: countError.message };
  }

  if ((count ?? 0) > 0) {
    return {
      error: "This organization already has active users. Ask an admin for an invite.",
    };
  }

  const result = await createOrganizationMembership({
    organizationId: input.organizationId,
    userId: input.userId,
    email: input.email,
    campaignRole: "admin",
    status: "active",
  });

  if ("error" in result) {
    return { error: result.error };
  }

  return { success: true };
}

export async function updateOrganizationMembership(
  membershipId: string,
  input: {
    organizationRoleId?: string | null;
    campaignRole?: CampaignRole;
    accessTemplateId?: string | null;
    status?: "active" | "invited" | "deactivated";
    displayName?: string | null;
    committeeId?: string | null;
    inviteMessage?: string | null;
  },
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();
  const updates: Record<string, string | null> = {};

  if (input.organizationRoleId !== undefined) {
    updates.organization_role_id = input.organizationRoleId;
  }

  if (input.campaignRole !== undefined) {
    if (!isCampaignRole(input.campaignRole)) {
      return { error: "Invalid access role." };
    }
    updates.campaign_role = input.campaignRole;
  }

  if (input.accessTemplateId !== undefined) {
    updates.access_template_id = input.accessTemplateId;
  }

  if (input.status !== undefined) {
    updates.status = input.status;
  }

  if (input.displayName !== undefined) {
    updates.display_name = input.displayName?.trim() || null;
  }

  if (input.committeeId !== undefined) {
    updates.committee_id = input.committeeId;
  }

  if (input.inviteMessage !== undefined) {
    updates.invite_message = input.inviteMessage?.trim() || null;
  }

  if (Object.keys(updates).length === 0) {
    return { success: true };
  }

  const { error } = await supabase
    .from("organization_users")
    .update(updates)
    .eq("id", membershipId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function deleteOrganizationMembership(
  membershipId: string,
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_users")
    .delete()
    .eq("id", membershipId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function cancelOrganizationInvite(
  membershipId: string,
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_users")
    .delete()
    .eq("id", membershipId)
    .eq("status", "invited");

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function refreshOrganizationInviteToken(
  membershipId: string,
): Promise<{ inviteToken: string } | { error: string }> {
  const supabase = await createClient();
  const inviteToken = randomUUID();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("organization_users")
    .update({
      invite_token: inviteToken,
      invited_at: now,
      invite_expires_at: computeInviteExpiresAt(new Date(now)),
    })
    .eq("id", membershipId)
    .eq("status", "invited")
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (!data) {
    return { error: "Pending invite not found." };
  }

  return { inviteToken };
}

export function resolveCampaignRoleForInvite(
  explicitRole: string | null | undefined,
  roleKind: OrganizationRoleKind | null | undefined,
): CampaignRole {
  if (explicitRole && isCampaignRole(explicitRole)) {
    return explicitRole;
  }

  return inferDefaultCampaignRole(roleKind);
}
