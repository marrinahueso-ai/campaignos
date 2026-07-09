import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { OrganizationWorkspaceShell } from "@/components/organization-workspace/OrganizationWorkspaceShell";
import { SettingsV2Card } from "@/components/settings-v2/SettingsV2Card";
import { SettingsV2PageHeader } from "@/components/settings-v2/SettingsV2PageHeader";
import { Button } from "@/components/ui/Button";
import {
  buildFallbackOrganizationWorkspaceData,
  getOrganizationWorkspaceData,
} from "@/lib/organization-workspace/queries";
import type { BrandAssets, Organization } from "@/types";

interface OrganizationSettingsContentProps {
  organization: Organization;
  brandAssets: BrandAssets | null;
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-1 border-b border-cos-border py-3 last:border-b-0 sm:flex-row sm:justify-between">
      <span className="text-sm text-cos-muted">{label}</span>
      <span className="text-sm font-medium text-cos-text">{value ?? "—"}</span>
    </div>
  );
}

export async function OrganizationSettingsContent({
  organization,
  brandAssets,
}: OrganizationSettingsContentProps) {
  const workspace =
    (await getOrganizationWorkspaceData(organization.id)) ??
    buildFallbackOrganizationWorkspaceData();

  return (
    <div className="space-y-6">
      <SettingsV2PageHeader
        title="Organization"
        description="Manage your school profile, branding, and workspace preferences."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <SettingsV2Card
          title="Organization Details"
          description="Basic information used across Hey Ralli."
          actions={
            <Button variant="secondary" size="sm" href="/settings/school-setup">
              Edit profile
            </Button>
          }
        >
          <DetailRow label="Name" value={organization.name} />
          <DetailRow label="Location" value={organization.district} />
          <DetailRow label="Timezone" value={organization.timezone} />
          <DetailRow label="Type" value="PTO" />
          <DetailRow label="Website" value={organization.ptoWebsite ?? organization.schoolWebsite} />
          <DetailRow label="School year" value={organization.schoolYear} />
        </SettingsV2Card>

        <SettingsV2Card
          title="Branding"
          description="Colors and visual identity for generated content."
          actions={
            <Button variant="secondary" size="sm" href="/settings/school-setup">
              Edit branding
            </Button>
          }
        >
          <DetailRow
            label="Primary color"
            value={brandAssets?.primaryColor ?? "#0F2E38"}
          />
          <DetailRow
            label="Accent color"
            value={brandAssets?.secondaryColor ?? "#DDBA4C"}
          />
          <DetailRow
            label="Default font style"
            value={brandAssets?.fontFamily ?? "Modern"}
          />
          <DetailRow
            label="PTO logo"
            value={brandAssets?.ptoLogo ? "Uploaded" : "Not uploaded"}
          />
          <DetailRow
            label="School logo"
            value={brandAssets?.schoolLogo ? "Uploaded" : "Not uploaded"}
          />
        </SettingsV2Card>

        <SettingsV2Card
          title="Preferences"
          description="Language and regional defaults."
          actions={
            <Button variant="secondary" size="sm" href="/settings/posting-schedule">
              Edit preferences
            </Button>
          }
        >
          <DetailRow label="Language" value="English (US)" />
          <DetailRow label="Timezone" value={organization.timezone} />
          <DetailRow
            label="Principal"
            value={organization.principal}
          />
          <DetailRow label="Mascot" value={organization.mascot} />
        </SettingsV2Card>

        <SettingsV2Card
          title="Board roster workspace"
          description="Upload your board roster and manage VP/committee structure."
          footer={
            <Link
              href="#board-roster"
              className="inline-flex items-center gap-1 text-sm font-medium text-cos-text hover:text-cos-primary"
            >
              Open board roster
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Link>
          }
        >
          <p className="text-sm leading-relaxed text-cos-muted">
            Assign person names to each VP and committee chair. Committees nest
            under their VP in collapsible groups.
          </p>
        </SettingsV2Card>
      </div>

      <div id="board-roster">
        <SettingsV2Card title="Board Roster & Roles">
          <OrganizationWorkspaceShell workspace={workspace} />
        </SettingsV2Card>
      </div>
    </div>
  );
}
