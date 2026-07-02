import "server-only";

import {
  syncSchoolYearSubscribeFeed,
  type SyncSubscribeFeedResult,
} from "@/lib/calendar-import/sync-subscribe-feed";
import { getActiveSubscribeFeedTargets } from "@/lib/school-years/subscribe-feed-targets";

/** Daily cron — auto-import new feed events (deduped). */
export async function syncAllActiveSubscribeFeeds(): Promise<{
  targetCount: number;
  results: SyncSubscribeFeedResult[];
}> {
  const targets = await getActiveSubscribeFeedTargets();
  const results: SyncSubscribeFeedResult[] = [];

  for (const target of targets) {
    const result = await syncSchoolYearSubscribeFeed({
      organizationId: target.organizationId,
      organizationSchoolYear: target.organizationSchoolYear,
      schoolYear: target.schoolYear,
      autoImport: true,
    });
    results.push(result);
  }

  return {
    targetCount: targets.length,
    results,
  };
}
