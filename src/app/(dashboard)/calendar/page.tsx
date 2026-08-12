import { Suspense } from "react";
import { CalendarImportForm } from "@/components/calendar-import/CalendarImportForm";
import { CalendarSubscribeFeedSection } from "@/components/calendar-import/CalendarSubscribeFeedSection";
import { GoogleCalendarImportSection } from "@/components/calendar-import/GoogleCalendarImportSection";
import { CalendarImportReview } from "@/components/calendar-review/CalendarImportReview";
import { CalendarReviewEmptyEase } from "@/components/calendar-review/CalendarReviewEmptyEase";
import { UnifiedCalendarShell } from "@/components/unified-calendar/UnifiedCalendarShell";
import { getCalendarReviewPageData } from "@/lib/calendar-import/queries";
import { getCalendarLayoutForCurrentUser } from "@/lib/communications-calendar/calendar-layout-queries";
import { getPlanningCalendarData } from "@/lib/communications-calendar/planning-queries";
import type { PlanningCalendarView } from "@/types/communications-calendar";

export const metadata = {
  title: "Calendar | Hey Ralli",
  description:
    "Your year in one place — events, posts, deadlines, and what needs attention.",
};

interface CalendarPageProps {
  searchParams: Promise<{ tab?: string; import?: string }>;
}

const VIEW_TABS = new Set<PlanningCalendarView>([
  "month",
  "week",
  "best-times",
  "agenda",
  "import-list",
  "import",
  "review",
]);

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const params = await searchParams;

  const initialView =
    params.tab && VIEW_TABS.has(params.tab as PlanningCalendarView)
      ? (params.tab as PlanningCalendarView)
      : undefined;

  const [planningData, initialLayout, reviewPage] = await Promise.all([
    getPlanningCalendarData(),
    getCalendarLayoutForCurrentUser(),
    getCalendarReviewPageData(params.import),
  ]);

  const importSections = {
    google: (
      <Suspense
        fallback={
          <p className="text-sm text-cos-muted">Loading Google Calendar…</p>
        }
      >
        <GoogleCalendarImportSection variant="ease" />
      </Suspense>
    ),
    subscribe: (
      <Suspense
        fallback={
          <p className="text-sm text-cos-muted">Loading calendar feed…</p>
        }
      >
        <CalendarSubscribeFeedSection variant="ease" />
      </Suspense>
    ),
    upload: <CalendarImportForm variant="ease" />,
  };

  const reviewPanel =
    reviewPage.importRecord && reviewPage.reviewData ? (
      <CalendarImportReview
        importId={reviewPage.importRecord.id}
        parseStatus={reviewPage.importRecord.parseStatus}
        parseError={reviewPage.importRecord.parseError}
        data={reviewPage.reviewData}
        importedEventCount={reviewPage.importedEventCount}
        playbookOptions={reviewPage.playbookOptions}
        hasPriorImportedCalendar={reviewPage.hasPriorImportedCalendar}
        embedded
      />
    ) : (
      <CalendarReviewEmptyEase />
    );

  const pendingReviewCount =
    reviewPage.importRecord?.parseStatus === "parsed" && reviewPage.reviewData
      ? reviewPage.reviewData.events.filter(
          (event) =>
            event.status === "ready" ||
            event.status === "needs_review" ||
            event.status === "update" ||
            event.status === "conflict",
        ).length
      : 0;

  return (
    <UnifiedCalendarShell
      data={planningData}
      initialLayout={initialLayout}
      initialView={initialView}
      importSections={importSections}
      reviewPanel={reviewPanel}
      pendingReviewCount={pendingReviewCount}
    />
  );
}
