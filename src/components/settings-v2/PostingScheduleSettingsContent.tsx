import { PostingPreferencesSection } from "@/components/settings/PostingPreferencesSection";
import { SettingsV2Card } from "@/components/settings-v2/SettingsV2Card";
import { SettingsV2PageHeader } from "@/components/settings-v2/SettingsV2PageHeader";
import { Button } from "@/components/ui/Button";
import type { Organization } from "@/types";

interface PostingScheduleSettingsContentProps {
  organization: Organization | null;
  hasPreferences: boolean;
}

function formatHour(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const normalized = hour % 12 === 0 ? 12 : hour % 12;
  return `${normalized}:00 ${period}`;
}

export function PostingScheduleSettingsContent({
  organization,
  hasPreferences,
}: PostingScheduleSettingsContentProps) {
  const windows = organization?.preferredPostingHours ?? [];
  const defaultWindow = windows[0];

  return (
    <div className="space-y-6">
      <SettingsV2PageHeader
        title="Posting Schedule"
        description="Set your organization timezone and preferred posting windows. These power the calendar week-view heatmap."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <SettingsV2Card title="Timezone">
          <p className="text-sm text-cos-text">
            {organization?.timezone ?? "Not configured"}
          </p>
        </SettingsV2Card>

        <SettingsV2Card title="Best times to post">
          {defaultWindow ? (
            <ul className="space-y-2 text-sm text-cos-muted">
              <li>
                Mon–Thu: {formatHour(defaultWindow.startHour)} –{" "}
                {formatHour(defaultWindow.endHour)}
              </li>
              <li>Recommended windows based on your saved preferences.</li>
            </ul>
          ) : (
            <p className="text-sm text-cos-muted">
              Save posting preferences below to generate recommended windows.
            </p>
          )}
        </SettingsV2Card>

        <SettingsV2Card title="Posting Windows">
          <p className="text-sm text-cos-muted">
            Enable recommended windows or customize hours per day in the form
            below.
          </p>
        </SettingsV2Card>

        <SettingsV2Card title="Posting Reminders">
          <p className="text-sm text-cos-muted">
            Weekly posting summary emails are coming soon.
          </p>
        </SettingsV2Card>
      </div>

      {hasPreferences ? (
        <SettingsV2Card title="Edit schedule">
          <PostingPreferencesSection />
        </SettingsV2Card>
      ) : (
        <SettingsV2Card title="Set up your school first">
          <p className="text-sm text-cos-muted">
            Complete School Setup so Hey Ralli knows which organization timezone
            and posting windows to use.
          </p>
          <Button className="mt-4" href="/settings/school-setup">
            Go to School Setup
          </Button>
        </SettingsV2Card>
      )}

      <SettingsV2Card title="Calendar heatmap">
        <p className="text-sm leading-relaxed text-cos-muted">
          After saving, open the communications calendar week view and toggle
          &ldquo;Best times to post&rdquo; to see your preferred hours highlighted.
        </p>
        <Button variant="secondary" className="mt-4" href="/calendar">
          Open calendar
        </Button>
      </SettingsV2Card>
    </div>
  );
}
