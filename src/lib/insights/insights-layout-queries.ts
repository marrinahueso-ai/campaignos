import "server-only";

import { getActiveMembership } from "@/lib/auth/membership-queries";
import { createClient } from "@/lib/supabase/server";
import {
  defaultInsightsLayout,
  normalizeInsightsLayout,
  type InsightsLayout,
} from "@/lib/insights/insights-layout";

export async function getInsightsLayoutForCurrentUser(): Promise<InsightsLayout> {
  const membership = await getActiveMembership();
  if (!membership) {
    return defaultInsightsLayout();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_users")
    .select("insights_layout")
    .eq("id", membership.user.id)
    .maybeSingle();

  if (error) {
    if (error.code === "42703" || error.message.includes("insights_layout")) {
      return defaultInsightsLayout();
    }
    console.error("[insights] failed to load layout:", error.message);
    return defaultInsightsLayout();
  }

  return normalizeInsightsLayout(
    (data as { insights_layout?: unknown } | null)?.insights_layout,
  );
}
