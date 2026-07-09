import { SettingsV2Card } from "@/components/settings-v2/SettingsV2Card";
import { SettingsV2PageHeader } from "@/components/settings-v2/SettingsV2PageHeader";
import { Button } from "@/components/ui/Button";

const SCHOOL_SETUP_CARDS = [
  {
    title: "School details",
    description: "Name, district, principal, and mascot.",
  },
  {
    title: "Important dates",
    description: "School year boundaries and key calendar dates.",
  },
  {
    title: "Contacts",
    description: "Board roster and committee chair contacts.",
  },
  {
    title: "Grades & rooms",
    description: "Grade levels and classroom organization.",
  },
  {
    title: "Resources",
    description: "Handbooks, FAQs, and helpful links.",
  },
  {
    title: "School hours",
    description: "Daily schedule and early dismissal days.",
  },
] as const;

export function SchoolSetupShellContent() {
  return (
    <div className="space-y-6">
      <SettingsV2PageHeader
        title="School Setup"
        description="Configure school-specific details and resources for your workspace."
        actions={
          <Button href="/settings/school-setup?view=wizard" size="sm">
            Open setup wizard
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SCHOOL_SETUP_CARDS.map((card) => (
          <SettingsV2Card key={card.title} title={card.title}>
            <p className="text-sm leading-relaxed text-cos-muted">{card.description}</p>
            <p className="mt-3 text-xs font-medium text-amber-700">Coming soon</p>
          </SettingsV2Card>
        ))}
      </div>

      <p className="text-center text-sm text-cos-muted">More settings coming soon</p>
    </div>
  );
}
