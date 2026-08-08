"use server";

import { revalidatePath } from "next/cache";
import {
  inviteTeamMemberAction,
  type AuthActionState,
} from "@/lib/auth/actions";
import {
  campaignRoleLabel,
  isCampaignRole,
  type CampaignRole,
} from "@/lib/auth/campaign-roles";
import {
  listOrganizationUserEventIds,
  replaceOrganizationUserEventAssignments,
} from "@/lib/auth/event-assignments";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { getAuthUser } from "@/lib/auth/queries";
import { requirePermission } from "@/lib/access-templates/effective-access";
import { getOrganizationAccessTemplates } from "@/lib/access-templates/queries";
import { createClient } from "@/lib/supabase/server";
import { getEventById } from "@/lib/events/queries";
import {
  buildInviteEventMemberRoleOptions,
  isValidInviteEmail,
  mergeEventAssignmentIds,
  type InviteEventMemberLookup,
  type InviteEventMemberRoleOption,
} from "@/lib/events-phase3/invite-event-member";

export type LookupEventInviteMemberResult =
  | { success: true; member: InviteEventMemberLookup | null }
  | { success: false; error: string };

export type LoadInviteEventMemberRolesResult =
  | { success: true; roles: InviteEventMemberRoleOption[] }
  | { success: false; error: string };

export type InviteEventTeamMemberResult = AuthActionState & {
  inviteeName?: string | null;
  roleLabel?: string | null;
};

export type AddExistingMemberToEventResult = AuthActionState & {
  memberName?: string | null;
  roleLabel?: string | null;
  alreadyAssigned?: boolean;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function requireMembershipInCurrentOrg(
  membershipId: string,
): Promise<{ organizationId: string } | { error: string }> {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return { error: "Sign in and set up your organization first." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_users")
    .select("id")
    .eq("id", membershipId)
    .eq("organization_id", organization.id)
    .maybeSingle();

  if (error || !data) {
    return { error: "Team member not found in this organization." };
  }

  return { organizationId: organization.id };
}

export async function loadInviteEventMemberRolesAction(): Promise<LoadInviteEventMemberRolesResult> {
  const managePeople = await requirePermission("manage_people");
  if ("error" in managePeople) {
    return {
      success: false,
      error: "You do not have permission to invite team members.",
    };
  }

  const organization = await getCurrentOrganization();
  if (!organization) {
    return { success: false, error: "Sign in and set up your organization first." };
  }

  const templates = await getOrganizationAccessTemplates(organization.id);
  return {
    success: true,
    roles: buildInviteEventMemberRoleOptions(templates),
  };
}

export async function lookupEventInviteMemberByEmailAction(input: {
  email: string;
  eventId: string;
}): Promise<LookupEventInviteMemberResult> {
  const managePeople = await requirePermission("manage_people");
  if ("error" in managePeople) {
    return {
      success: false,
      error: "You do not have permission to invite team members.",
    };
  }

  const organization = await getCurrentOrganization();
  if (!organization) {
    return { success: false, error: "Sign in and set up your organization first." };
  }

  const email = normalizeEmail(input.email);
  if (!isValidInviteEmail(email)) {
    return { success: true, member: null };
  }

  const event = await getEventById(input.eventId);
  if (!event) {
    return { success: false, error: "Event not found." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_users")
    .select(
      "id, email, display_name, campaign_role, access_template_id, status",
    )
    .eq("organization_id", organization.id)
    .ilike("email", email)
    .maybeSingle();

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data) {
    return { success: true, member: null };
  }

  const status = data.status as InviteEventMemberLookup["status"];
  if (status !== "active" && status !== "invited" && status !== "deactivated") {
    return { success: true, member: null };
  }

  const campaignRole = isCampaignRole(String(data.campaign_role))
    ? (data.campaign_role as CampaignRole)
    : "contributor";

  const templates = await getOrganizationAccessTemplates(organization.id);
  const templateId = (data.access_template_id as string | null) ?? campaignRole;
  const roleLabel =
    templates.find((template) => template.id === templateId)?.displayName ??
    campaignRoleLabel(campaignRole);

  const assignedEventIds = await listOrganizationUserEventIds(data.id as string);

  return {
    success: true,
    member: {
      membershipId: data.id as string,
      email: String(data.email ?? email),
      displayName: (data.display_name as string | null) ?? null,
      campaignRole,
      roleLabel,
      status,
      assignedEventIds,
      alreadyOnEvent: assignedEventIds.includes(input.eventId),
    },
  };
}

/**
 * Invite a new (or re-invite pending) org member and assign the current event.
 * Reuses inviteTeamMemberAction — does not create a parallel invite system.
 */
export async function inviteEventTeamMemberAction(input: {
  email: string;
  fullName: string;
  campaignRole: string;
  eventId: string;
}): Promise<InviteEventTeamMemberResult> {
  const managePeople = await requirePermission("manage_people");
  if ("error" in managePeople) {
    return {
      error: "You do not have permission to invite team members.",
      success: false,
    };
  }

  const event = await getEventById(input.eventId);
  if (!event) {
    return { error: "Event not found.", success: false };
  }

  // Guard: never send a duplicate org invite for an active member.
  const lookup = await lookupEventInviteMemberByEmailAction({
    email: input.email,
    eventId: input.eventId,
  });
  if (!lookup.success) {
    return { error: lookup.error, success: false };
  }
  if (lookup.member?.status === "active") {
    return {
      error:
        "This person is already on your team. Add them to this event instead of sending a new invite.",
      success: false,
    };
  }

  const formData = new FormData();
  formData.set("email", input.email.trim());
  formData.set("fullName", input.fullName.trim());
  formData.set("campaignRole", input.campaignRole);
  formData.set("sendEmail", "true");
  formData.set("eventIdsCsv", input.eventId);

  const result = await inviteTeamMemberAction(
    { error: null, success: false },
    formData,
  );

  if (result.success) {
    revalidatePath(`/events/${input.eventId}`);
  }

  const organization = await getCurrentOrganization();
  let roleLabel: string | null = null;
  if (organization) {
    const templates = await getOrganizationAccessTemplates(organization.id);
    roleLabel =
      templates.find((template) => template.id === input.campaignRole)
        ?.displayName ??
      (isCampaignRole(input.campaignRole)
        ? campaignRoleLabel(input.campaignRole)
        : input.campaignRole);
  }

  return {
    ...result,
    inviteeName: input.fullName.trim() || input.email.trim(),
    roleLabel,
  };
}

/**
 * Add an existing active org member to this event without changing their org role.
 */
export async function addExistingMemberToEventAction(input: {
  organizationUserId: string;
  eventId: string;
}): Promise<AddExistingMemberToEventResult> {
  const user = await getAuthUser();
  if (!user) {
    return { error: "Sign in first.", success: false };
  }

  const managePeople = await requirePermission("manage_people");
  if ("error" in managePeople) {
    return {
      error: "You do not have permission to update event assignments.",
      success: false,
    };
  }

  const orgMembership = await requireMembershipInCurrentOrg(
    input.organizationUserId,
  );
  if ("error" in orgMembership) {
    return { error: orgMembership.error, success: false };
  }

  const event = await getEventById(input.eventId);
  if (!event) {
    return { error: "Event not found.", success: false };
  }

  const supabase = await createClient();
  const { data: member, error: memberError } = await supabase
    .from("organization_users")
    .select("id, display_name, email, campaign_role, access_template_id, status")
    .eq("id", input.organizationUserId)
    .eq("organization_id", orgMembership.organizationId)
    .maybeSingle();

  if (memberError || !member) {
    return { error: "Team member not found.", success: false };
  }

  if (member.status !== "active") {
    return {
      error: "Only active team members can be added directly to an event.",
      success: false,
    };
  }

  const existingEventIds = await listOrganizationUserEventIds(
    input.organizationUserId,
  );
  if (existingEventIds.includes(input.eventId)) {
    const templates = await getOrganizationAccessTemplates(
      orgMembership.organizationId,
    );
    const campaignRole = isCampaignRole(String(member.campaign_role))
      ? (member.campaign_role as CampaignRole)
      : "contributor";
    const templateId =
      (member.access_template_id as string | null) ?? campaignRole;
    return {
      error: null,
      success: true,
      alreadyAssigned: true,
      message: "This person already has access to this event.",
      memberName:
        (member.display_name as string | null)?.trim() ||
        String(member.email ?? ""),
      roleLabel:
        templates.find((template) => template.id === templateId)?.displayName ??
        campaignRoleLabel(campaignRole),
    };
  }

  const nextEventIds = mergeEventAssignmentIds(existingEventIds, input.eventId);
  const result = await replaceOrganizationUserEventAssignments({
    organizationId: orgMembership.organizationId,
    organizationUserId: input.organizationUserId,
    eventIds: nextEventIds,
  });

  if ("error" in result) {
    return { error: result.error, success: false };
  }

  const templates = await getOrganizationAccessTemplates(
    orgMembership.organizationId,
  );
  const campaignRole = isCampaignRole(String(member.campaign_role))
    ? (member.campaign_role as CampaignRole)
    : "contributor";
  const templateId =
    (member.access_template_id as string | null) ?? campaignRole;

  revalidatePath("/settings/team-access");
  revalidatePath(`/events/${input.eventId}`);

  return {
    error: null,
    success: true,
    alreadyAssigned: false,
    message: "Added to this event.",
    memberName:
      (member.display_name as string | null)?.trim() ||
      String(member.email ?? ""),
    roleLabel:
      templates.find((template) => template.id === templateId)?.displayName ??
      campaignRoleLabel(campaignRole),
  };
}
