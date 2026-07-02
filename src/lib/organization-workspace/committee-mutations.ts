import { createClient } from "@/lib/supabase/server";
import type { CommunicationStrategy } from "@/types/communication-strategy";
import type { OrganizationRoleKind } from "@/types/organization-workspace";
import type { ParsedRosterRole } from "@/lib/organization-workspace/parse-roster";

export interface OrganizationCommitteeInput {
  name: string;
  parentRoleId: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactName?: string | null;
  communicationStrategy?: CommunicationStrategy;
  playbookSlug?: string | null;
  eventMatchKey?: string | null;
  sortOrder?: number;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
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

async function getNextCommitteeSortOrder(
  organizationId: string,
  parentRoleId: string | null,
): Promise<number> {
  const supabase = await createClient();
  let query = supabase
    .from("organization_committees")
    .select("sort_order")
    .eq("organization_id", organizationId)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (parentRoleId) {
    query = query.eq("parent_role_id", parentRoleId);
  }

  const { data } = await query.maybeSingle();
  return (data?.sort_order ?? 0) + 10;
}

export async function createOrganizationCommittee(
  organizationId: string,
  input: OrganizationCommitteeInput,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const name = input.name.trim();

  if (!name) {
    return { error: "Committee name is required." };
  }

  const sortOrder =
    input.sortOrder ??
    (await getNextCommitteeSortOrder(organizationId, input.parentRoleId));

  const { data, error } = await supabase
    .from("organization_committees")
    .insert({
      organization_id: organizationId,
      name,
      parent_role_id: input.parentRoleId,
      contact_email: normalizeEmail(input.contactEmail),
      contact_phone: normalizePhone(input.contactPhone),
      contact_name: normalizeContactName(input.contactName),
      communication_strategy: input.communicationStrategy ?? "full_campaign",
      playbook_slug: input.playbookSlug ?? null,
      event_match_key: input.eventMatchKey ?? null,
      sort_order: sortOrder,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  return { id: data.id };
}

export async function updateOrganizationCommittee(
  committeeId: string,
  input: Partial<OrganizationCommitteeInput>,
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();
  const updates: Record<string, string | number | null> = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) {
      return { error: "Committee name is required." };
    }
    updates.name = name;
  }

  if (input.parentRoleId !== undefined) {
    updates.parent_role_id = input.parentRoleId;
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

  if (input.communicationStrategy !== undefined) {
    updates.communication_strategy = input.communicationStrategy;
  }

  if (input.playbookSlug !== undefined) {
    updates.playbook_slug = input.playbookSlug;
  }

  if (input.eventMatchKey !== undefined) {
    updates.event_match_key = input.eventMatchKey;
  }

  if (input.sortOrder !== undefined) {
    updates.sort_order = input.sortOrder;
  }

  if (Object.keys(updates).length === 0) {
    return { success: true };
  }

  const { error } = await supabase
    .from("organization_committees")
    .update(updates)
    .eq("id", committeeId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function deleteOrganizationCommittee(
  committeeId: string,
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("organization_committees")
    .delete()
    .eq("id", committeeId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function deleteAllOrganizationCommittees(
  organizationId: string,
): Promise<{ error: string } | { success: true; deletedCount: number }> {
  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from("organization_committees")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if (countError) {
    return { error: countError.message };
  }

  const { error } = await supabase
    .from("organization_committees")
    .delete()
    .eq("organization_id", organizationId);

  if (error) {
    return { error: error.message };
  }

  return { success: true, deletedCount: count ?? 0 };
}

export async function clearOrganizationRosterImport(
  organizationId: string,
): Promise<
  | { error: string }
  | { success: true; deletedCommittees: number; deletedRoles: number }
> {
  const supabase = await createClient();

  const [{ count: committeeCount, error: committeeCountError }, { count: roleCount, error: roleCountError }] =
    await Promise.all([
      supabase
        .from("organization_committees")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId),
      supabase
        .from("organization_roles")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId),
    ]);

  if (committeeCountError || roleCountError) {
    return {
      error:
        committeeCountError?.message ??
        roleCountError?.message ??
        "Unable to count roster records.",
    };
  }

  const { error: deleteCommitteesError } = await supabase
    .from("organization_committees")
    .delete()
    .eq("organization_id", organizationId);

  if (deleteCommitteesError) {
    return { error: deleteCommitteesError.message };
  }

  const { error: deleteRolesError } = await supabase
    .from("organization_roles")
    .delete()
    .eq("organization_id", organizationId);

  if (deleteRolesError) {
    return { error: deleteRolesError.message };
  }

  const { error: deleteMatrixError } = await supabase
    .from("responsibility_matrix")
    .delete()
    .eq("organization_id", organizationId);

  if (deleteMatrixError) {
    return { error: deleteMatrixError.message };
  }

  const { seedOrganizationWorkspace } = await import(
    "@/lib/organization-workspace/seed"
  );
  await seedOrganizationWorkspace(organizationId);

  return {
    success: true,
    deletedCommittees: committeeCount ?? 0,
    deletedRoles: roleCount ?? 0,
  };
}

export async function applyOrganizationRosterImport(
  organizationId: string,
  roster: ParsedRosterRole[],
): Promise<
  | { error: string }
  | { success: true; roleCount: number; committeeCount: number }
> {
  if (roster.length === 0) {
    return { error: "No roles or committees found in the roster." };
  }

  const supabase = await createClient();

  const { data: existingRoles, error: rolesError } = await supabase
    .from("organization_roles")
    .select("id, name")
    .eq("organization_id", organizationId);

  if (rolesError) {
    return { error: rolesError.message };
  }

  const roleIdByName = new Map(
    (existingRoles ?? []).map((row) => [normalizeName(row.name), row.id]),
  );

  for (let index = 0; index < roster.length; index += 1) {
    const entry = roster[index];
    const key = normalizeName(entry.name);
    const sortOrder = (index + 1) * 10;
    const existingId = roleIdByName.get(key);

    if (existingId) {
      const { error } = await supabase
        .from("organization_roles")
        .update({
          contact_email: normalizeEmail(entry.contactEmail),
          contact_name: normalizeContactName(entry.contactName),
          role_kind: entry.roleKind as OrganizationRoleKind,
          sort_order: sortOrder,
        })
        .eq("id", existingId);

      if (error) {
        return { error: error.message };
      }
      continue;
    }

    const { data: inserted, error } = await supabase
      .from("organization_roles")
      .insert({
        organization_id: organizationId,
        name: entry.name.trim(),
        system_role: false,
        description: null,
        contact_email: normalizeEmail(entry.contactEmail),
        contact_phone: null,
        contact_name: normalizeContactName(entry.contactName),
        role_kind: entry.roleKind,
        sort_order: sortOrder,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      return { error: error?.message ?? "Unable to create role." };
    }

    roleIdByName.set(key, inserted.id);
  }

  const { error: deleteCommitteesError } = await supabase
    .from("organization_committees")
    .delete()
    .eq("organization_id", organizationId);

  if (deleteCommitteesError) {
    return { error: deleteCommitteesError.message };
  }

  const committeeRows: Record<string, unknown>[] = [];

  for (const role of roster) {
    const parentRoleId = roleIdByName.get(normalizeName(role.name));
    if (!parentRoleId) {
      continue;
    }

    role.committees.forEach((committee, committeeIndex) => {
      committeeRows.push({
        organization_id: organizationId,
        name: committee.name.trim(),
        parent_role_id: parentRoleId,
        contact_email: normalizeEmail(committee.contactEmail),
        contact_phone: null,
        contact_name: normalizeContactName(committee.contactName),
        communication_strategy: "full_campaign",
        playbook_slug: null,
        event_match_key: null,
        sort_order: (committeeIndex + 1) * 10,
      });
    });
  }

  if (committeeRows.length > 0) {
    const { error: insertCommitteesError } = await supabase
      .from("organization_committees")
      .insert(committeeRows);

    if (insertCommitteesError) {
      return { error: insertCommitteesError.message };
    }
  }

  return {
    success: true,
    roleCount: roster.length,
    committeeCount: committeeRows.length,
  };
}
