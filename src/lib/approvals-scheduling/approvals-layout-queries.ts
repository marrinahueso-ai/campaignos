import "server-only";

import { getActiveMembership } from "@/lib/auth/membership-queries";
import { createClient } from "@/lib/supabase/server";
import {
  defaultApprovalsLayout,
  normalizeApprovalsLayout,
  type ApprovalsLayout,
} from "@/lib/approvals-scheduling/approvals-layout";

export async function getApprovalsLayoutForCurrentUser(): Promise<ApprovalsLayout> {
  const membership = await getActiveMembership();
  if (!membership) {
    return defaultApprovalsLayout();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_users")
    .select("approvals_layout")
    .eq("id", membership.user.id)
    .maybeSingle();

  if (error) {
    if (error.code === "42703" || error.message.includes("approvals_layout")) {
      return defaultApprovalsLayout();
    }
    console.error("[approvals] failed to load layout:", error.message);
    return defaultApprovalsLayout();
  }

  return normalizeApprovalsLayout(
    (data as { approvals_layout?: unknown } | null)?.approvals_layout,
  );
}
