import { Suspense } from "react";
import { redirect } from "next/navigation";
import { UnifiedCalendarShell } from "@/components/unified-calendar/UnifiedCalendarShell";
import { getPlanningCalendarData } from "@/lib/communications-calendar/planning-queries";

export const metadata = {
  title: "Calendar | Hey Ralli",
  description: "Your school year in one place — events, posts, deadlines, and what needs attention.",
};

interface CalendarPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const params = await searchParams;

  if (params.tab === "review") {
    redirect("/calendar/review");
  }

  return (
    <Suspense fallback={<CalendarPageFallback />}>
      <CalendarPageContent />
    </Suspense>
  );
}

async function CalendarPageContent() {
  const planningData = await getPlanningCalendarData();
  return <UnifiedCalendarShell data={planningData} />;
}

function CalendarPageFallback() {
  return (
    <div className="mx-auto max-w-[1600px] animate-pulse space-y-6 pb-8">
      <div className="h-28 rounded-2xl bg-cos-bg-alt" />
      <div className="h-32 rounded-2xl bg-cos-bg-alt" />
      <div className="h-96 rounded-2xl bg-cos-bg-alt" />
    </div>
  );
}
