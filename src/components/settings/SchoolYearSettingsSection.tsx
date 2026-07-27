import { SettingsEaseSchoolYear } from "@/components/settings-v2/SettingsEaseSchoolYear";
import { EmptyState } from "@/components/ui/EmptyState";
import { getSchoolYearSettingsData } from "@/lib/school-years/actions";
import { CalendarRange } from "lucide-react";

interface SchoolYearSettingsSectionProps {
  /** When nested under Branding hub, hide the page-level School year H1. */
  embedded?: boolean;
}

export async function SchoolYearSettingsSection({
  embedded = false,
}: SchoolYearSettingsSectionProps = {}) {
  const data = await getSchoolYearSettingsData();

  if (!data) {
    return (
      <EmptyState
        icon={CalendarRange}
        title="Create your workspace first"
        description="Start with your first event — takes about a minute."
        action={{ label: "Get started", href: "/onboarding" }}
        className="rounded-[22px] border border-[rgba(42,38,34,0.1)] bg-[#fffcf7] py-16 shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
      />
    );
  }

  return (
    <SettingsEaseSchoolYear
      key={
        data.activeSchoolYear?.id ?? data.organizationSchoolYearLabel ?? "none"
      }
      initialData={data}
      embedded={embedded}
    />
  );
}
