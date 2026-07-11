import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PostingPreferencesPanel } from "@/components/settings/PostingPreferencesPanel";
import { SettingsV2Card } from "@/components/settings-v2/SettingsV2Card";
import { SettingsV2PageHeader } from "@/components/settings-v2/SettingsV2PageHeader";
import { Button } from "@/components/ui/Button";
import { getPostingPreferencesSettingsData } from "@/lib/organizations/posting-preferences-actions";
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
  const postingPreferences = await getPostingPreferencesSettingsData();

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
          title="Board roster & committees"
          description="Manage members, roles, committees, and approval routing in one place."
          footer={
            <Link
              href="/settings/team-access"
              className="inline-flex items-center gap-1 text-sm font-medium text-cos-text hover:text-cos-primary"
            >
              Open Team & Access
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Link>
          }
        >
          <p className="text-sm leading-relaxed text-cos-muted">
            Board roster, committee structure, and team permissions now live in
            Team & Access.
          </p>
        </SettingsV2Card>
      </div>

      {postingPreferences ? (
        <PostingPreferencesPanel initialInput={postingPreferences.input} />
      ) : (
        <SettingsV2Card title="Timezone & posting windows">
          <p className="text-sm text-cos-muted">
            Complete School Setup so Hey Ralli knows which organization timezone
            and posting windows to use.
          </p>
          <Button className="mt-4" href="/settings/school-setup">
            Go to School Setup
          </Button>
        </SettingsV2Card>
      )}
    </div>
  );
}
