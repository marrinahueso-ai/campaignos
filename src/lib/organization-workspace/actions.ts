"use server";

import { revalidatePath } from "next/cache";
import { getLatestOrganization } from "@/lib/organizations/queries";
import {
  applyOrganizationRosterImport,
  archiveOrganizationCommittee,
  clearOrganizationRosterImport,
  createOrganizationCommittee,
  deleteAllOrganizationCommittees,
  deleteOrganizationCommittee,
  restoreOrganizationCommittee,
  updateOrganizationCommittee,
} from "@/lib/organization-workspace/committee-mutations";
import { parseRosterFromFile } from "@/lib/organization-workspace/parse-roster-file";
import {
  countRosterImport,
  type ParsedRosterRole,
} from "@/lib/organization-workspace/parse-roster";
import {
  createOrganizationMember,
  createOrganizationRole,
  deleteOrganizationMember,
  deleteOrganizationRole,
  updateCommitteeDefault,
  updateOrganizationMember,
  updateOrganizationRole,
  updateResponsibilityMatrixEntry,
} from "@/lib/organization-workspace/mutations";
import type { CampaignRole } from "@/lib/auth/campaign-roles";
import type { CommunicationStrategy } from "@/types/communication-strategy";

const ORGANIZATION_PATH = "/settings/organization";

export interface OrganizationActionState {
  error: string | null;
  success: boolean;
}

async function requireOrganizationId(): Promise<
  { organizationId: string } | { error: string }
> {
  const organization = await getLatestOrganization();

  if (!organization) {
    return { error: "Complete School Setup first to configure your organization." };
  }

  return { organizationId: organization.id };
}

function revalidateOrganizationWorkspace() {
  revalidatePath(ORGANIZATION_PATH);
  revalidatePath("/settings/team-access");
  revalidatePath("/events/[id]", "page");
}

export async function createOrganizationRoleAction(
  _prevState: OrganizationActionState,
  formData: FormData,
): Promise<OrganizationActionState> {
  const org = await requireOrganizationId();
  if ("error" in org) {
    return { error: org.error, success: false };
  }

  const name = formData.get("name")?.toString() ?? "";
  const description = formData.get("description")?.toString() ?? null;
  const contactEmail = formData.get("contactEmail")?.toString() ?? null;
  const contactPhone = formData.get("contactPhone")?.toString() ?? null;
  const contactName = formData.get("contactName")?.toString() ?? null;
  const roleKind = formData.get("roleKind")?.toString() ?? "other";

  const result = await createOrganizationRole(org.organizationId, {
    name,
    description,
    contactEmail,
    contactPhone,
    contactName,
    roleKind:
      roleKind === "president" || roleKind === "vp" || roleKind === "other"
        ? roleKind
        : "other",
  });

  if ("error" in result) {
    return { error: result.error, success: false };
  }

  revalidateOrganizationWorkspace();
  return { error: null, success: true };
}

export async function updateOrganizationRoleAction(
  roleId: string,
  input: {
    name?: string;
    description?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    contactName?: string | null;
    roleKind?: "president" | "vp" | "other" | null;
    campaignRole?: CampaignRole | null;
  },
): Promise<OrganizationActionState> {
  const org = await requireOrganizationId();
  if ("error" in org) {
    return { error: org.error, success: false };
  }

  const result = await updateOrganizationRole(roleId, input);

  if ("error" in result) {
    return { error: result.error, success: false };
  }

  revalidateOrganizationWorkspace();
  return { error: null, success: true };
}

export async function deleteOrganizationRoleAction(
  roleId: string,
): Promise<OrganizationActionState> {
  const org = await requireOrganizationId();
  if ("error" in org) {
    return { error: org.error, success: false };
  }

  const result = await deleteOrganizationRole(roleId);

  if ("error" in result) {
    return { error: result.error, success: false };
  }

  revalidateOrganizationWorkspace();
  return { error: null, success: true };
}

export async function createOrganizationMemberAction(
  _prevState: OrganizationActionState,
  formData: FormData,
): Promise<OrganizationActionState> {
  const org = await requireOrganizationId();
  if ("error" in org) {
    return { error: org.error, success: false };
  }

  const name = formData.get("name")?.toString() ?? "";
  const email = formData.get("email")?.toString() ?? "";
  const organizationRoleId =
    formData.get("organizationRoleId")?.toString() || null;
  const active = formData.get("active")?.toString() !== "false";

  const result = await createOrganizationMember(org.organizationId, {
    name,
    email,
    organizationRoleId,
    active,
  });

  if ("error" in result) {
    return { error: result.error, success: false };
  }

  revalidateOrganizationWorkspace();
  return { error: null, success: true };
}

export async function updateOrganizationMemberAction(
  memberId: string,
  input: {
    name?: string;
    email?: string;
    organizationRoleId?: string | null;
    active?: boolean;
    campaignRole?: CampaignRole | null;
  },
): Promise<OrganizationActionState> {
  const org = await requireOrganizationId();
  if ("error" in org) {
    return { error: org.error, success: false };
  }

  const result = await updateOrganizationMember(memberId, input);

  if ("error" in result) {
    return { error: result.error, success: false };
  }

  revalidateOrganizationWorkspace();
  return { error: null, success: true };
}

export async function deleteOrganizationMemberAction(
  memberId: string,
): Promise<OrganizationActionState> {
  const org = await requireOrganizationId();
  if ("error" in org) {
    return { error: org.error, success: false };
  }

  const result = await deleteOrganizationMember(memberId);

  if ("error" in result) {
    return { error: result.error, success: false };
  }

  revalidateOrganizationWorkspace();
  return { error: null, success: true };
}

export async function updateResponsibilityMatrixAction(
  entryId: string,
  defaultRoleId: string | null,
): Promise<OrganizationActionState> {
  const org = await requireOrganizationId();
  if ("error" in org) {
    return { error: org.error, success: false };
  }

  const result = await updateResponsibilityMatrixEntry(entryId, defaultRoleId);

  if ("error" in result) {
    return { error: result.error, success: false };
  }

  revalidateOrganizationWorkspace();
  return { error: null, success: true };
}

export async function updateCommitteeDefaultAction(
  entryId: string,
  input: {
    defaultRoleId?: string | null;
    communicationStrategy?: CommunicationStrategy;
    playbookSlug?: string | null;
  },
): Promise<OrganizationActionState> {
  const org = await requireOrganizationId();
  if ("error" in org) {
    return { error: org.error, success: false };
  }

  const result = await updateCommitteeDefault(entryId, input);

  if ("error" in result) {
    return { error: result.error, success: false };
  }

  revalidateOrganizationWorkspace();
  return { error: null, success: true };
}

export interface OrganizationRosterPreviewResult {
  error: string | null;
  roles: ParsedRosterRole[];
  roleCount: number;
  committeeCount: number;
}

export async function previewOrganizationRosterAction(
  formData: FormData,
): Promise<OrganizationRosterPreviewResult> {
  const file = formData.get("rosterFile");

  if (!(file instanceof File) || file.size === 0) {
    return {
      error: "Choose a roster file to upload.",
      roles: [],
      roleCount: 0,
      committeeCount: 0,
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = await parseRosterFromFile(buffer, file.name);

  if (parsed.error || parsed.roles.length === 0) {
    return {
      error: parsed.error ?? "Unable to read roster file.",
      roles: [],
      roleCount: 0,
      committeeCount: 0,
    };
  }

  const counts = countRosterImport(parsed.roles);

  return {
    error: null,
    roles: parsed.roles,
    ...counts,
  };
}

export async function applyOrganizationRosterAction(
  roles: ParsedRosterRole[],
): Promise<
  OrganizationActionState & { roleCount?: number; committeeCount?: number }
> {
  const org = await requireOrganizationId();
  if ("error" in org) {
    return { error: org.error, success: false };
  }

  const result = await applyOrganizationRosterImport(org.organizationId, roles);

  if ("error" in result) {
    return { error: result.error, success: false };
  }

  revalidateOrganizationWorkspace();
  return {
    error: null,
    success: true,
    roleCount: result.roleCount,
    committeeCount: result.committeeCount,
  };
}

export async function createOrganizationCommitteeAction(
  _prevState: OrganizationActionState,
  formData: FormData,
): Promise<OrganizationActionState> {
  const org = await requireOrganizationId();
  if ("error" in org) {
    return { error: org.error, success: false };
  }

  const parentRoleId = formData.get("parentRoleId")?.toString() || null;

  const result = await createOrganizationCommittee(org.organizationId, {
    name: formData.get("name")?.toString() ?? "",
    parentRoleId,
    contactEmail: formData.get("contactEmail")?.toString() ?? null,
    contactPhone: formData.get("contactPhone")?.toString() ?? null,
    contactName: formData.get("contactName")?.toString() ?? null,
  });

  if ("error" in result) {
    return { error: result.error, success: false };
  }

  revalidateOrganizationWorkspace();
  return { error: null, success: true };
}

export async function updateOrganizationCommitteeAction(
  committeeId: string,
  input: {
    name?: string;
    parentRoleId?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    contactName?: string | null;
    communicationStrategy?: CommunicationStrategy;
    playbookSlug?: string | null;
    campaignRole?: CampaignRole | null;
  },
): Promise<OrganizationActionState> {
  const org = await requireOrganizationId();
  if ("error" in org) {
    return { error: org.error, success: false };
  }

  const result = await updateOrganizationCommittee(committeeId, input);

  if ("error" in result) {
    return { error: result.error, success: false };
  }

  revalidateOrganizationWorkspace();
  return { error: null, success: true };
}

export async function archiveOrganizationCommitteeAction(
  committeeId: string,
): Promise<OrganizationActionState> {
  const org = await requireOrganizationId();
  if ("error" in org) {
    return { error: org.error, success: false };
  }

  const result = await archiveOrganizationCommittee(committeeId);

  if ("error" in result) {
    return { error: result.error, success: false };
  }

  revalidateOrganizationWorkspace();
  return { error: null, success: true };
}

export async function restoreOrganizationCommitteeAction(
  committeeId: string,
): Promise<OrganizationActionState> {
  const org = await requireOrganizationId();
  if ("error" in org) {
    return { error: org.error, success: false };
  }

  const result = await restoreOrganizationCommittee(committeeId);

  if ("error" in result) {
    return { error: result.error, success: false };
  }

  revalidateOrganizationWorkspace();
  return { error: null, success: true };
}

export async function deleteOrganizationCommitteeAction(
  committeeId: string,
): Promise<OrganizationActionState> {
  const org = await requireOrganizationId();
  if ("error" in org) {
    return { error: org.error, success: false };
  }

  const result = await deleteOrganizationCommittee(committeeId);

  if ("error" in result) {
    return { error: result.error, success: false };
  }

  revalidateOrganizationWorkspace();
  return { error: null, success: true };
}

export async function clearAllOrganizationCommitteesAction(): Promise<
  OrganizationActionState & { deletedCount?: number }
> {
  const org = await requireOrganizationId();
  if ("error" in org) {
    return { error: org.error, success: false };
  }

  const result = await deleteAllOrganizationCommittees(org.organizationId);

  if ("error" in result) {
    return { error: result.error, success: false };
  }

  revalidateOrganizationWorkspace();
  return { error: null, success: true, deletedCount: result.deletedCount };
}

export async function clearOrganizationRosterImportAction(): Promise<
  OrganizationActionState & {
    deletedCommittees?: number;
    deletedRoles?: number;
  }
> {
  const org = await requireOrganizationId();
  if ("error" in org) {
    return { error: org.error, success: false };
  }

  const result = await clearOrganizationRosterImport(org.organizationId);

  if ("error" in result) {
    return { error: result.error, success: false };
  }

  revalidateOrganizationWorkspace();
  return {
    error: null,
    success: true,
    deletedCommittees: result.deletedCommittees,
    deletedRoles: result.deletedRoles,
  };
}
