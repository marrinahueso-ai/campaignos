import { SettingsPreferencesForm } from "@/components/settings/SettingsPreferencesForm";
import { SchoolYearSettingsSection } from "@/components/settings/SchoolYearSettingsSection";
import { StudioPageHeader } from "@/components/layout/StudioPageHeader";
import Link from "next/link";

export const metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <div className="studio-page mx-auto max-w-2xl space-y-10 pb-12">
      <StudioPageHeader
        title="Settings"
        description="Configure your PTO organization profile and campaign preferences."
        eyebrow="Configure"
      />

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

      <SchoolYearSettingsSection />
      <SettingsPreferencesForm />
    </div>
  );
}
