import { CalendarDays } from "lucide-react";
import { DashboardWidgetCard } from "@/components/today/DashboardWidgetCard";
import { WeekAheadStrip } from "@/components/today/WeekAheadStrip";
import type { TodayWeekEntry } from "@/types/today";

interface ThisWeekWidgetProps {
  today: string;
  weekEntries: TodayWeekEntry[];
}

export function ThisWeekWidget({ today, weekEntries }: ThisWeekWidgetProps) {
  return (
    <DashboardWidgetCard icon={CalendarDays} title="This week" showMenu={false}>
      <WeekAheadStrip entries={weekEntries} today={today} />
    </DashboardWidgetCard>
  );
}
