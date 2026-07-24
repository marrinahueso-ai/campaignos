import { redirect } from "next/navigation";
import { UnifiedCalendarShell } from "@/components/unified-calendar/UnifiedCalendarShell";
import { getCalendarLayoutForCurrentUser } from "@/lib/communications-calendar/calendar-layout-queries";
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

  // Single async page body — route `loading.tsx` covers the wait. Avoid a nested
  // Suspense fallback here: revalidate/refresh can briefly stack that skeleton
  // above the live calendar (looks like two calendars).
  const [planningData, initialLayout] = await Promise.all([
    getPlanningCalendarData(),
    getCalendarLayoutForCurrentUser(),
  ]);

  return (
    <UnifiedCalendarShell
      data={planningData}
      initialLayout={initialLayout}
    />
  );
}
