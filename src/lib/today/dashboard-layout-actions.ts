"use server";

import { revalidatePath } from "next/cache";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeDashboardLayout,
  type DashboardLayout,
} from "@/lib/today/dashboard-widgets";

export async function saveDashboardLayoutAction(
  layout: DashboardLayout,
): Promise<{ success: boolean; error?: string }> {
  const membership = await getActiveMembership();
  if (!membership) {
    return { success: false, error: "Not signed in." };
  }

  const { assertOrgFeature } = await import("@/lib/billing/gates");
  const featureGate = await assertOrgFeature(membership.organizationId, "custom_dashboard");
  if (!featureGate.ok) {
    return {
      success: false,
      error: `${featureGate.message} ${featureGate.upgradeHint}`,
    };
  }

  const normalized = normalizeDashboardLayout(layout);
  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_users")
    .update({ dashboard_layout: normalized })
    .eq("id", membership.user.id)
    .eq("organization_id", membership.organizationId);

  if (error) {
    console.error("[dashboard] failed to save layout:", error.message);
    return { success: false, error: "Could not save dashboard layout." };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
