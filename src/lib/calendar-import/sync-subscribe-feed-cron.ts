import "server-only";

import {
  syncSchoolYearSubscribeFeed,
  type SyncSubscribeFeedResult,
} from "@/lib/calendar-import/sync-subscribe-feed";
import { getActiveSubscribeFeedTargets } from "@/lib/school-years/subscribe-feed-targets";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/** Daily cron — auto-import new feed events (deduped). */
export async function syncAllActiveSubscribeFeeds(): Promise<{
  targetCount: number;
  results: SyncSubscribeFeedResult[];
}> {
  if (!isSupabaseAdminConfigured()) {
    console.error(
      "Subscribe feed cron: SUPABASE_SERVICE_ROLE_KEY is not configured",
    );
    return { targetCount: 0, results: [] };
  }

  const targets = await getActiveSubscribeFeedTargets({ useServiceRole: true });
  const results: SyncSubscribeFeedResult[] = [];

  for (const target of targets) {
    const result = await syncSchoolYearSubscribeFeed({
      organizationId: target.organizationId,
      organizationSchoolYear: target.organizationSchoolYear,
      schoolYear: target.schoolYear,
      autoImport: true,
      useServiceRole: true,
    });
    results.push(result);
  }

  return {
    targetCount: targets.length,
    results,
  };
}
