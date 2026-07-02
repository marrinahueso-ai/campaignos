import { createClient } from "@/lib/supabase/server";
import type { CommunicationStrategy } from "@/types/communication-strategy";
import type { OrganizationRoleKind } from "@/types/organization-workspace";

export interface OrganizationRoleInput {
  name: string;
  description?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactName?: string | null;
  roleKind?: OrganizationRoleKind | null;
  sortOrder?: number;
}

function normalizeEmail(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizePhone(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeContactName(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function getNextRoleSortOrder(organizationId: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organization_roles")
    .select("sort_order")
    .eq("organization_id", organizationId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.sort_order ?? 0) + 10;
}

export async function createOrganizationRole(
  organizationId: string,
  input: OrganizationRoleInput,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const name = input.name.trim();

  if (!name) {
    return { error: "Role name is required." };
  }

  const sortOrder =
    input.sortOrder ?? (await getNextRoleSortOrder(organizationId));

  const { data, error } = await supabase
    .from("organization_roles")
    .insert({
      organization_id: organizationId,
      name,
      system_role: false,
      description: input.description?.trim() || null,
      contact_email: normalizeEmail(input.contactEmail),
      contact_phone: normalizePhone(input.contactPhone),
      contact_name: normalizeContactName(input.contactName),
      role_kind: input.roleKind ?? "other",
      sort_order: sortOrder,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "A role with this name already exists." };
    }
    return { error: error.message };
  }

  return { id: data.id };
}

export async function updateOrganizationRole(
  roleId: string,
  input: Partial<OrganizationRoleInput>,
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();

  const updates: Record<string, string | number | null> = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) {
      return { error: "Role name is required." };
    }
    updates.name = name;
  }

  if (input.description !== undefined) {
    updates.description = input.description?.trim() || null;
  }

  if (input.contactEmail !== undefined) {
    updates.contact_email = normalizeEmail(input.contactEmail);
  }

  if (input.contactPhone !== undefined) {
    updates.contact_phone = normalizePhone(input.contactPhone);
  }

  if (input.contactName !== undefined) {
    updates.contact_name = normalizeContactName(input.contactName);
  }

  if (input.roleKind !== undefined) {
    updates.role_kind = input.roleKind;
  }

  if (input.sortOrder !== undefined) {
    updates.sort_order = input.sortOrder;
  }

  if (Object.keys(updates).length === 0) {
    return { success: true };
  }

  const { error } = await supabase
    .from("organization_roles")
    .update(updates)
    .eq("id", roleId);

  if (error) {
    if (error.code === "23505") {
      return { error: "A role with this name already exists." };
    }
    return { error: error.message };
  }

  return { success: true };
}

export async function deleteOrganizationRole(
  roleId: string,
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();

  const { data: role, error: fetchError } = await supabase
    .from("organization_roles")
    .select("id")
    .eq("id", roleId)
    .single();

  if (fetchError || !role) {
    return { error: "Role not found." };
  }

  const { error } = await supabase
    .from("organization_roles")
    .delete()
    .eq("id", roleId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function createOrganizationMember(
  organizationId: string,
  input: {
    name: string;
    email: string;
    organizationRoleId: string | null;
    active?: boolean;
  },
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const name = input.name.trim();
  const email = input.email.trim();

  if (!name) {
    return { error: "Name is required." };
  }

  if (!email) {
    return { error: "Email is required." };
  }

  const { data, error } = await supabase
    .from("organization_members")
    .insert({
      organization_id: organizationId,
      name,
      email,
      organization_role_id: input.organizationRoleId,
      active: input.active ?? true,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  return { id: data.id };
}

export async function updateOrganizationMember(
  memberId: string,
  input: {
    name?: string;
    email?: string;
    organizationRoleId?: string | null;
    active?: boolean;
  },
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();
  const updates: Record<string, string | boolean | null> = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) {
      return { error: "Name is required." };
    }
    updates.name = name;
  }

  if (input.email !== undefined) {
    const email = input.email.trim();
    if (!email) {
      return { error: "Email is required." };
    }
    updates.email = email;
  }

  if (input.organizationRoleId !== undefined) {
    updates.organization_role_id = input.organizationRoleId;
  }

  if (input.active !== undefined) {
    updates.active = input.active;
  }

  if (Object.keys(updates).length === 0) {
    return { success: true };
  }

  const { error } = await supabase
    .from("organization_members")
    .update(updates)
    .eq("id", memberId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function deleteOrganizationMember(
  memberId: string,
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("id", memberId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function updateResponsibilityMatrixEntry(
  entryId: string,
  defaultRoleId: string | null,
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("responsibility_matrix")
    .update({ default_role_id: defaultRoleId })
    .eq("id", entryId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function updateCommitteeDefault(
  entryId: string,
  input: {
    defaultRoleId?: string | null;
    communicationStrategy?: CommunicationStrategy;
    playbookSlug?: string | null;
  },
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();
  const updates: Record<string, string | null> = {};

  if (input.defaultRoleId !== undefined) {
    updates.default_role_id = input.defaultRoleId;
  }

  if (input.communicationStrategy !== undefined) {
    updates.communication_strategy = input.communicationStrategy;
  }

  if (input.playbookSlug !== undefined) {
    updates.playbook_slug = input.playbookSlug;
  }

  if (Object.keys(updates).length === 0) {
    return { success: true };
  }

  const { error } = await supabase
    .from("committee_defaults")
    .update(updates)
    .eq("id", entryId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
