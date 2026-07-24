"use server";

import { revalidatePath } from "next/cache";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeApprovalsLayout,
  type ApprovalsLayout,
} from "@/lib/approvals-scheduling/approvals-layout";

export async function saveApprovalsLayoutAction(
  layout: ApprovalsLayout,
): Promise<{ success: boolean; error?: string }> {
  const membership = await getActiveMembership();
  if (!membership) {
    return { success: false, error: "Not signed in." };
  }

  const normalized = normalizeApprovalsLayout(layout);
  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_users")
    .update({ approvals_layout: normalized })
    .eq("id", membership.user.id)
    .eq("organization_id", membership.organizationId);

  if (error) {
    console.error("[approvals] failed to save layout:", error.message);
    return { success: false, error: "Could not save Approvals card layout." };
  }

  revalidatePath("/approvals");
  return { success: true };
}
