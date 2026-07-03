import { SettingsPreferencesForm } from "@/components/settings/SettingsPreferencesForm";
import { SchoolYearSettingsSection } from "@/components/settings/SchoolYearSettingsSection";
import { StudioPageHeader } from "@/components/layout/StudioPageHeader";
import { isOrganizationBillingExempt } from "@/lib/auth/founding-access";
import { getLatestOrganization } from "@/lib/organizations/queries";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export const metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const organization = await getLatestOrganization();
  const isFoundingPartner =
    organization && isOrganizationBillingExempt(organization);

  return (
    <div className="studio-page mx-auto max-w-2xl space-y-10 pb-12">
      <StudioPageHeader
        title="Settings"
        description="Configure your PTO organization profile and campaign preferences."
        eyebrow="Configure"
      />

      {isFoundingPartner && (
        <section className="cos-card border-cos-accent/30 bg-cos-bg/40">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-cos-accent" strokeWidth={1.5} />
            <div>
              <h2 className="font-display text-2xl text-cos-text">Founding partner</h2>
              <p className="mt-2 text-sm leading-relaxed text-cos-muted">
                Your workspace has founding partner benefits
                {organization.foundingAccessCode
                  ? ` (code ${organization.foundingAccessCode} applied)`
                  : ""}
                . Billing is waived during early access.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="cos-card">
        <h2 className="font-display text-2xl text-cos-text">Team & access</h2>
        <p className="mt-2 text-sm leading-relaxed text-cos-muted">
          Invite board members and assign who can approve communications.
        </p>
        <Link
          href="/settings/team"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-cos-text transition-colors hover:text-cos-primary"
        >
          Manage team →
        </Link>
      </section>

      <section className="cos-card">
        <h2 className="font-display text-2xl text-cos-text">Posting schedule</h2>
        <p className="mt-2 text-sm leading-relaxed text-cos-muted">
          Set your organization timezone and preferred posting windows for the
          calendar heatmap.
        </p>
        <Link
          href="/settings/posting-schedule"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-cos-text transition-colors hover:text-cos-primary"
        >
          Configure posting schedule →
        </Link>
      </section>

      <SchoolYearSettingsSection />
      <SettingsPreferencesForm />
    </div>
  );
}
