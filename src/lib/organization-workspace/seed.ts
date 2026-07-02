import { createClient } from "@/lib/supabase/server";
import {
  COMMITTEE_DEFAULTS,
  COMMITTEE_LABELS,
  DEFAULT_COMMITTEE_ROLE_NAMES,
  DEFAULT_RESPONSIBILITY_ROLE_NAMES,
  RESPONSIBILITY_TYPES,
} from "@/lib/organization-workspace/constants";
import { DEFAULT_ORGANIZATION_ROLE_TEMPLATE } from "@/lib/organization-workspace/role-templates";
import type { OrganizationRoleRow } from "@/types/organization-workspace";

export async function areOrganizationWorkspaceTablesAvailable(): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_roles")
    .select("id")
    .limit(1);

  return !error || error.code !== "42P01";
}

export async function ensureOrganizationWorkspaceSeeded(
  organizationId: string,
): Promise<void> {
  await seedOrganizationWorkspace(organizationId);
}

export async function seedOrganizationWorkspace(
  organizationId: string,
): Promise<void> {
  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from("organization_roles")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if (countError) {
    console.error("Failed to check organization roles:", countError.message);
    return;
  }

  if ((count ?? 0) > 0) {
    return;
  }

  const roleRows = DEFAULT_ORGANIZATION_ROLE_TEMPLATE.map((role) => ({
    organization_id: organizationId,
    name: role.name,
    system_role: false,
    description: role.description,
    contact_email: role.contactEmail ?? null,
    contact_phone: role.contactPhone ?? null,
    role_kind: role.roleKind,
    sort_order: role.sortOrder,
  }));

  const { data: insertedRoles, error: roleError } = await supabase
    .from("organization_roles")
    .insert(roleRows)
    .select("*");

  if (roleError || !insertedRoles) {
    console.error("Failed to seed organization roles:", roleError?.message);
    return;
  }

  const roleByName = new Map(
    (insertedRoles as OrganizationRoleRow[]).map((row) => [row.name, row.id]),
  );

  const matrixRows = RESPONSIBILITY_TYPES.map(({ value }) => {
    const roleName = DEFAULT_RESPONSIBILITY_ROLE_NAMES[value];
    return {
      organization_id: organizationId,
      responsibility_type: value,
      default_role_id: roleByName.get(roleName) ?? null,
    };
  });

  const committeeRows = COMMITTEE_DEFAULTS.map(
    ({ value, defaultStrategy, defaultPlaybookSlug }, index) => {
      const roleName = DEFAULT_COMMITTEE_ROLE_NAMES[value];
      return {
        organization_id: organizationId,
        name: COMMITTEE_LABELS[value],
        parent_role_id: roleByName.get(roleName) ?? null,
        communication_strategy: defaultStrategy,
        playbook_slug: defaultPlaybookSlug,
        event_match_key: value,
        sort_order: (index + 1) * 10,
      };
    },
  );

  const [{ error: matrixError }, { error: committeeError }] = await Promise.all([
    supabase.from("responsibility_matrix").insert(matrixRows),
    supabase.from("organization_committees").insert(committeeRows),
  ]);

  if (matrixError) {
    console.error("Failed to seed responsibility matrix:", matrixError.message);
  }

  if (committeeError) {
    console.error("Failed to seed committee defaults:", committeeError.message);
  }
}
