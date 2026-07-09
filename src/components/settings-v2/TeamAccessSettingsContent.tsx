import { TeamSettingsPanel } from "@/components/settings/TeamSettingsPanel";
import { SettingsV2PageHeader } from "@/components/settings-v2/SettingsV2PageHeader";
import { Button } from "@/components/ui/Button";
import type { OrganizationUser } from "@/types/auth";
import type { OrganizationRole } from "@/types/organization-workspace";

interface TeamAccessSettingsContentProps {
  members: OrganizationUser[];
  roles: OrganizationRole[];
  canManage: boolean;
  showClaimBanner: boolean;
  currentUserEmail: string | null;
  siteOrigin: string;
  canProvisionAccounts: boolean;
}

export function TeamAccessSettingsContent({
  members,
  roles,
  canManage,
  showClaimBanner,
  currentUserEmail,
  siteOrigin,
  canProvisionAccounts,
}: TeamAccessSettingsContentProps) {
  const pendingCount = members.filter((member) => member.status === "invited").length;

  return (
    <div className="space-y-6">
      <SettingsV2PageHeader
        title="Team & Access"
        description="Invite board members and assign who can approve communications."
        actions={
          <>
            <Button href="#invite-member" size="sm">
              Invite member
            </Button>
            <Button variant="secondary" size="sm" href="#team-panel">
              Manage roles
            </Button>
          </>
        }
      />

      <div id="team-panel">
        <TeamSettingsPanel
          members={members}
          roles={roles}
          canManage={canManage}
          showClaimBanner={showClaimBanner}
          currentUserEmail={currentUserEmail}
          siteOrigin={siteOrigin}
          canProvisionAccounts={canProvisionAccounts}
        />
      </div>

      {pendingCount > 2 ? (
        <p className="text-sm text-cos-muted">
          More pending invites ({pendingCount - 2}) — scroll the table above to review.
        </p>
      ) : null}
    </div>
  );
}
