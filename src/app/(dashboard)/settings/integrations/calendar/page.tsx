import Link from "next/link";
import { Suspense } from "react";
import { CalendarSubscribeFeedSection } from "@/components/calendar-import/CalendarSubscribeFeedSection";
import { SettingsV2PageHeader } from "@/components/settings-v2/SettingsV2PageHeader";
import { Button } from "@/components/ui/Button";

export const metadata = {
  title: "Google Calendar · Integrations",
};

export default function CalendarIntegrationPage() {
  return (
    <div className="space-y-6">
      <SettingsV2PageHeader
        title="Google Calendar"
        description="Link your school calendar subscribe feed and refresh it without duplicating events. You can also upload a calendar file."
      />

      <Suspense
        fallback={
          <p className="text-sm text-cos-muted">Loading calendar feed…</p>
        }
      >
        <CalendarSubscribeFeedSection />
      </Suspense>

      <div className="rounded-2xl border border-cos-border bg-white p-6 shadow-sm">
        <h2 className="font-display text-xl text-cos-text">Upload a file</h2>
        <p className="mt-1 text-sm text-cos-muted">
          Prefer a one-time ICS or PDF upload instead of a live subscribe feed?
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button href="/calendar/import" size="sm">
            Upload calendar file
          </Button>
          <Button href="/calendar/review" variant="secondary" size="sm">
            Review imported events
          </Button>
        </div>
      </div>

      <p className="text-sm text-cos-muted">
        <Link
          href="/settings/integrations"
          className="font-medium text-cos-text hover:underline"
        >
          Back to Integrations
        </Link>
      </p>
    </div>
  );
}
