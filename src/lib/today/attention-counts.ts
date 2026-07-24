import "server-only";

import { getDashboardRichListData } from "@/lib/today/dashboard-rich-widgets";
import type { TodayAttentionCounts } from "@/types/today";

export async function getTodayAttentionCounts(): Promise<TodayAttentionCounts> {
  const data = await getDashboardRichListData();

  return {
    reviewCount: data.approvals.length,
    volunteerCount: data.underfilledEvents.length,
    tasksThisWeekCount: data.tasksThisWeek.length,
  };
}
