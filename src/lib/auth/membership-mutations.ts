import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import {
  type CampaignRole,
  isCampaignRole,
} from "@/lib/auth/campaign-roles";
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
  organizationRoleId?: string | null;
  campaignRole?: CampaignRole;
  invitedByUserId: string;
}): Promise<{ id: string; inviteToken: string } | { error: string }> {
  const supabase = await createClient();
  const email = normalizeEmail(input.email);
  const inviteToken = randomUUID();
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("organization_users")
    .select("id, status")
    .eq("organization_id", input.organizationId)
    .ilike("email", email)
    .maybeSingle();

  if (existing?.status === "active") {
    return { error: "This person is already an active team member." };
  }

  if (existing) {
    const { error } = await supabase
      .from("organization_users")
      .update({
        organization_role_id: input.organizationRoleId ?? null,
        campaign_role: input.campaignRole ?? "contributor",
        status: "invited",
        invite_token: inviteToken,
        invited_by_user_id: input.invitedByUserId,
        invited_at: now,
        user_id: null,
        joined_at: null,
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
      organization_role_id: input.organizationRoleId ?? null,
      campaign_role: input.campaignRole ?? "contributor",
      status: "invited",
      invite_token: inviteToken,
      invited_by_user_id: input.invitedByUserId,
      invited_at: now,
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
    status?: "active" | "invited" | "deactivated";
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

  if (input.status !== undefined) {
    updates.status = input.status;
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

export function resolveCampaignRoleForInvite(
  explicitRole: string | null | undefined,
  roleKind: OrganizationRoleKind | null | undefined,
): CampaignRole {
  if (explicitRole && isCampaignRole(explicitRole)) {
    return explicitRole;
  }

  return inferDefaultCampaignRole(roleKind);
}
