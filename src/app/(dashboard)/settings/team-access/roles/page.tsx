import { TeamAccessRolesSettingsContent } from "@/components/settings-v2/team-access/TeamAccessRolesSettingsContent";
import { getOrganizationAccessTemplates } from "@/lib/access-templates/queries";
import {
  accessHasPermission,
  getEffectiveAccess,
} from "@/lib/access-templates/effective-access";
import { getOrganizationUsers } from "@/lib/auth/membership-queries";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import type { OrganizationUser } from "@/types/auth";

export const metadata = {
  title: "Roles & permissions",
};

function memberCountsByTemplateId(
  members: OrganizationUser[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const member of members) {
    const templateId = member.accessTemplateId ?? member.campaignRole;
    counts[templateId] = (counts[templateId] ?? 0) + 1;
  }
  return counts;
}

export default async function TeamAccessRolesSettingsPage() {
  const [organization, access] = await Promise.all([
    getCurrentOrganization(),
    getEffectiveAccess(),
  ]);

  if (!organization) {
    return (
      <section>
        <h1
          className="m-0 text-[clamp(28px,3.2vw,40px)] font-bold leading-[1.05] tracking-tight text-[#201b17]"
          style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
        >
          Roles & permissions
        </h1>
        <p className="mt-2 max-w-[48ch] text-sm font-medium text-[#737373]">
          Finish setting up your organization first, then return here to define
          roles.
        </p>
      </section>
    );
  }

  const [accessTemplates, members] = await Promise.all([
    getOrganizationAccessTemplates(organization.id),
    getOrganizationUsers(organization.id),
  ]);

  const canEdit = Boolean(
    access && accessHasPermission(access, "manage_people"),
  );

  return (
    <TeamAccessRolesSettingsContent
      accessTemplates={accessTemplates}
      canEdit={canEdit}
      memberCountsByTemplateId={memberCountsByTemplateId(members)}
    />
  );
}
