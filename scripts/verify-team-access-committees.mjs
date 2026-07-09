import { createClient } from "@supabase/supabase-js";
import { buildUnifiedTeamMembers } from "../src/components/settings-v2/team-access/team-access-utils.ts";
import { mapOrganizationCommitteeRow } from "../src/lib/organization-workspace/committee-mappers.ts";
import { mapOrganizationRoleRow } from "../src/lib/organization-workspace/mappers.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const sb = createClient(url, key);

const orgId =
  process.env.ORG_ID ??
  (await sb.from("organizations").select("id").limit(1)).data?.[0]?.id;

if (!orgId) {
  console.error("No organization found");
  process.exit(1);
}

const [{ data: roleRows }, { data: committeeRows }] = await Promise.all([
  sb.from("organization_roles").select("*").eq("organization_id", orgId),
  sb.from("organization_committees").select("*").eq("organization_id", orgId),
]);

const roles = (roleRows ?? []).map((row) => mapOrganizationRoleRow(row));
const roleNames = new Map(roles.map((role) => [role.id, role.name]));
const committees = (committeeRows ?? []).map((row) =>
  mapOrganizationCommitteeRow(
    row,
    row.parent_role_id ? roleNames.get(row.parent_role_id) ?? null : null,
  ),
);

const workspace = {
  roles,
  members: [],
  responsibilityMatrix: [],
  committeeDefaults: [],
  committees,
};

const unified = buildUnifiedTeamMembers([], workspace);

for (const target of ["Rebecca Kidd", "Molly Crosby"]) {
  const member = unified.find((entry) => entry.displayName === target);
  console.log(`\n${target}`);
  if (!member) {
    console.log("  NOT FOUND");
    continue;
  }
  console.log(`  committeeCount: ${member.committeeCount}`);
  console.log(`  hasRoleOversight: ${member.hasRoleOversight}`);
  console.log(
    "  committees:",
    member.committees
      .map((assignment) => `${assignment.committee.name} [${assignment.roleOnCommittee}]`)
      .join(", "),
  );
}
