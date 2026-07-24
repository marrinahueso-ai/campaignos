import { CalendarRange } from "lucide-react";
import { DashboardWidgetCard } from "@/components/today/DashboardWidgetCard";
import { SnapshotMiniCalendar } from "@/components/today/SnapshotMiniCalendar";
import type { TodayWeekEntry } from "@/types/today";

interface CalendarWidgetProps {
  today: string;
  monthEvents: TodayWeekEntry[];
}

export function CalendarWidget({ today, monthEvents }: CalendarWidgetProps) {
  return (
    <DashboardWidgetCard icon={CalendarRange} title="Calendar" showMenu={false}>
      <SnapshotMiniCalendar today={today} entries={monthEvents} />
    </DashboardWidgetCard>
  );
}
