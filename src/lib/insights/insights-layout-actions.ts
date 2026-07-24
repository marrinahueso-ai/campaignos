"use server";

import { revalidatePath } from "next/cache";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeInsightsLayout,
  type InsightsLayout,
} from "@/lib/insights/insights-layout";

export async function saveInsightsLayoutAction(
  layout: InsightsLayout,
): Promise<{ success: boolean; error?: string }> {
  const membership = await getActiveMembership();
  if (!membership) {
    return { success: false, error: "Not signed in." };
  }

  const normalized = normalizeInsightsLayout(layout);
  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_users")
    .update({ insights_layout: normalized })
    .eq("id", membership.user.id)
    .eq("organization_id", membership.organizationId);

  if (error) {
    console.error("[insights] failed to save layout:", error.message);
    return { success: false, error: "Could not save Insights card layout." };
  }

  revalidatePath("/insights");
  return { success: true };
}
