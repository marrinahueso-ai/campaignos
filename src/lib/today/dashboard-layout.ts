import "server-only";

import { getActiveMembership } from "@/lib/auth/membership-queries";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  normalizeDashboardLayout,
  type DashboardLayout,
} from "@/lib/today/dashboard-widgets";

export async function getDashboardLayoutForCurrentUser(): Promise<DashboardLayout> {
  const membership = await getActiveMembership();
  if (!membership) {
    return { ...DEFAULT_DASHBOARD_LAYOUT };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_users")
    .select("dashboard_layout")
    .eq("id", membership.user.id)
    .maybeSingle();

  if (error) {
    // Column may not exist until migration is applied.
    if (error.code === "42703" || error.message.includes("dashboard_layout")) {
      return { ...DEFAULT_DASHBOARD_LAYOUT };
    }
    console.error("[dashboard] failed to load layout:", error.message);
    return { ...DEFAULT_DASHBOARD_LAYOUT };
  }

  return normalizeDashboardLayout(data?.dashboard_layout);
}
