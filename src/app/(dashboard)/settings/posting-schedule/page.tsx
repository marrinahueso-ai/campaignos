import { PostingPreferencesSection } from "@/components/settings/PostingPreferencesSection";
import { StudioPageHeader } from "@/components/layout/StudioPageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { CalendarClock } from "lucide-react";
import { getPostingPreferencesSettingsData } from "@/lib/organizations/posting-preferences-actions";

export const metadata = {
  title: "Posting schedule",
};

export default async function PostingScheduleSettingsPage() {
  const data = await getPostingPreferencesSettingsData();

  return (
    <div className="studio-page mx-auto max-w-2xl space-y-10 pb-12">
      <StudioPageHeader
        backHref="/settings"
        title="Posting schedule"
        description="Set your organization timezone and preferred posting windows. These power the calendar week-view heatmap."
        eyebrow="Configure"
      />

      {data ? (
        <PostingPreferencesSection />
      ) : (
        <EmptyState
          icon={CalendarClock}
          title="Set up your school first"
          description="Complete School Setup so CampaignOS knows which organization timezone and posting windows to use."
          action={{ label: "Go to School Setup", href: "/settings/school-setup" }}
          className="cos-card py-16"
        />
      )}

      <section className="cos-card border-dashed">
        <h2 className="font-display text-xl text-cos-text">Calendar heatmap</h2>
        <p className="mt-2 text-sm leading-relaxed text-cos-muted">
          After saving, open the communications calendar week view and toggle
          &ldquo;Best times to post&rdquo; to see your preferred hours highlighted.
        </p>
        <Button variant="secondary" className="mt-4" href="/calendar">
          Open calendar
        </Button>
      </section>
    </div>
  );
}
