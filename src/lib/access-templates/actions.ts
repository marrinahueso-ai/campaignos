"use server";

import { revalidatePath } from "next/cache";
import { canManageTeam } from "@/lib/auth/infer-campaign-role";
import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import {
  isCampaignRole,
  type CampaignRole,
} from "@/lib/auth/campaign-roles";
import {
  applySafetyLocks,
  buildCustomTemplateId,
  getDefaultAccessTemplate,
  normalizePermissions,
} from "@/lib/access-templates/defaults";
import {
  deleteOrganizationAccessTemplate,
  upsertOrganizationAccessTemplate,
} from "@/lib/access-templates/mutations";
import { getOrganizationAccessTemplates } from "@/lib/access-templates/queries";
import { findAccessTemplate } from "@/lib/access-templates/merge";
import type { AccessTemplate } from "@/lib/access-templates/types";
import {
  ACCESS_PERMISSION_KEYS,
  isCustomAccessTemplateId,
} from "@/lib/access-templates/types";

function revalidateTeamAccess() {
  revalidatePath("/settings/team-access");
  revalidatePath("/settings/team-access", "layout");
}

async function requireTemplateEditor() {
  const membership = await getActiveMembership();
  const campaignRole = await getCurrentCampaignRole();

  if (!membership) {
    return {
      error: "Sign in and set up your organization first." as const,
      membership: null,
    };
  }
  if (!canManageTeam(campaignRole)) {
    return {
      error: "Only Admin or President can edit access templates." as const,
      membership: null,
    };
  }
  return { error: null, membership };
}

export async function saveOrganizationAccessTemplateAction(input: {
  templateId: string;
  displayName: string;
  description?: string;
  permissions: Record<string, boolean>;
  baseRole?: string;
}): Promise<{ error: string | null; success: boolean }> {
  const gate = await requireTemplateEditor();
  if (gate.error || !gate.membership) {
    return { error: gate.error ?? "Unable to save.", success: false };
  }

  const isSystem = isCampaignRole(input.templateId);
  const isCustom = isCustomAccessTemplateId(input.templateId);
  if (!isSystem && !isCustom) {
    return { error: "Unknown access template.", success: false };
  }

  const existing = findAccessTemplate(
    await getOrganizationAccessTemplates(gate.membership.organizationId),
    input.templateId,
  );

  let baseRole: CampaignRole = "contributor";
  if (input.baseRole && isCampaignRole(input.baseRole)) {
    baseRole = input.baseRole;
  } else if (existing?.baseRole) {
    baseRole = existing.baseRole;
  } else if (isSystem && isCampaignRole(input.templateId)) {
    baseRole = input.templateId;
  }

  const defaults = getDefaultAccessTemplate(baseRole);
  const permissions = applySafetyLocks(
    input.templateId,
    normalizePermissions(input.permissions, existing?.permissions ?? defaults.permissions),
    baseRole,
  );

  const cleaned: Record<string, boolean> = {};
  for (const key of ACCESS_PERMISSION_KEYS) {
    cleaned[key] = permissions[key];
  }

  const displayName = input.displayName.trim();
  if (!displayName) {
    return { error: "Display name is required.", success: false };
  }

  const template: AccessTemplate = {
    id: input.templateId,
    displayName,
    description: input.description?.trim() || existing?.description || defaults.description,
    permissions: cleaned as AccessTemplate["permissions"],
    baseRole,
    isCustom,
  };

  const result = await upsertOrganizationAccessTemplate({
    organizationId: gate.membership.organizationId,
    template,
  });

  if ("error" in result) {
    return { error: result.error, success: false };
  }

  revalidateTeamAccess();
  return { error: null, success: true };
}

export async function createOrganizationAccessTemplateAction(input: {
  displayName: string;
  description?: string;
  /** Clone permissions / base role from this template. */
  cloneFromTemplateId?: string;
  baseRole?: string;
}): Promise<{ error: string | null; success: boolean; templateId?: string }> {
  const gate = await requireTemplateEditor();
  if (gate.error || !gate.membership) {
    return { error: gate.error ?? "Unable to create.", success: false };
  }

  const displayName = input.displayName.trim();
  if (!displayName) {
    return { error: "Display name is required.", success: false };
  }

  const templates = await getOrganizationAccessTemplates(
    gate.membership.organizationId,
  );
  const cloneFrom =
    findAccessTemplate(templates, input.cloneFromTemplateId) ??
    getDefaultAccessTemplate("contributor");

  const baseRole: CampaignRole =
    input.baseRole && isCampaignRole(input.baseRole)
      ? input.baseRole
      : cloneFrom.baseRole;

  // New custom roles cannot start as Admin/President lockout seats.
  const safeBase: CampaignRole =
    baseRole === "admin" || baseRole === "president" ? "contributor" : baseRole;

  const templateId = buildCustomTemplateId(displayName);
  const template: AccessTemplate = {
    id: templateId,
    displayName,
    description:
      input.description?.trim() ||
      `Custom role based on ${cloneFrom.displayName}.`,
    permissions: applySafetyLocks(
      templateId,
      { ...cloneFrom.permissions, manage_people: false },
      safeBase,
    ),
    baseRole: safeBase,
    isCustom: true,
  };

  const result = await upsertOrganizationAccessTemplate({
    organizationId: gate.membership.organizationId,
    template,
  });

  if ("error" in result) {
    return { error: result.error, success: false };
  }

  revalidateTeamAccess();
  return { error: null, success: true, templateId };
}

export async function deleteOrganizationAccessTemplateAction(input: {
  templateId: string;
}): Promise<{ error: string | null; success: boolean }> {
  const gate = await requireTemplateEditor();
  if (gate.error || !gate.membership) {
    return { error: gate.error ?? "Unable to delete.", success: false };
  }

  const result = await deleteOrganizationAccessTemplate({
    organizationId: gate.membership.organizationId,
    templateId: input.templateId,
  });

  if ("error" in result) {
    return { error: result.error, success: false };
  }

  revalidateTeamAccess();
  return { error: null, success: true };
}
