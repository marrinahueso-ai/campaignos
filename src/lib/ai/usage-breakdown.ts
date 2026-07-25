import "server-only";

import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { assertActiveMembershipInOrganization } from "@/lib/auth/membership-queries";
import { periodYmUtc } from "@/lib/ai/credit-constants";
import {
  aggregateUsageByCategory,
  rankUsageByMember,
  type AiUsageAggregationRow,
  type CategoryUsageEntry,
  type MemberUsageEntry,
} from "@/lib/ai/usage-breakdown-pure";

export type { CategoryUsageEntry, MemberUsageEntry } from "@/lib/ai/usage-breakdown-pure";

export type MemberUsageEntryWithLabel = MemberUsageEntry & { label: string };

export type OrgAiUsageBreakdown = {
  periodYm: string;
  byMember: MemberUsageEntryWithLabel[];
  byCategory: CategoryUsageEntry[];
};

function emptyBreakdown(periodYm: string): OrgAiUsageBreakdown {
  return { periodYm, byMember: [], byCategory: aggregateUsageByCategory([]) };
}

/** Start of the current UTC-month AI credit period — same boundary ensurePeriodAllowance grants against. */
function currentPeriodStartUtc(periodYm: string): string {
  return `${periodYm}-01T00:00:00.000Z`;
}

async function resolveMemberLabels(
  orgId: string,
  userIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!userIds.length || !isSupabaseAdminConfigured()) return map;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organization_users")
    .select("user_id, email")
    .eq("organization_id", orgId)
    .in("user_id", userIds)
    .limit(500);
  if (error) {
    console.error("[ai-usage-breakdown] member label lookup failed:", error.message);
    return map;
  }
  for (const row of data ?? []) {
    const id = row.user_id as string | null;
    if (!id || map.has(id)) continue;
    const label = (row.email as string | null)?.trim() || id.slice(0, 8);
    map.set(id, label);
  }
  return map;
}

/**
 * Org-scoped "who used the most AI" + "usage by category" breakdown for the
 * current AI credit period. Admin-client-backed (ai_usage_log is
 * service-role only), but only after verifying the caller has an active
 * membership in this org — never a general cross-org query.
 *
 * Historical caveat: rows logged before artwork actions carried userId
 * (see docs/ops/billing-and-access.md) have user_id = null and are grouped
 * under a single "Unknown member" entry in byMember, and always classify as
 * "Artwork Generation" (never "Regeneration") in byCategory since
 * metadata.isRegeneration didn't exist yet.
 */
export async function getOrgAiUsageBreakdown(
  orgId: string,
): Promise<OrgAiUsageBreakdown> {
  const trimmed = orgId?.trim();
  const periodYm = periodYmUtc();
  if (!trimmed || !isSupabaseAdminConfigured()) {
    return emptyBreakdown(periodYm);
  }

  const allowed = await assertActiveMembershipInOrganization(trimmed);
  if (!allowed) {
    return emptyBreakdown(periodYm);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ai_usage_log")
    .select("user_id, action_type, success, metadata")
    .eq("organization_id", trimmed)
    .gte("created_at", currentPeriodStartUtc(periodYm))
    .limit(20_000);

  if (error) {
    if (error.code !== "42P01") {
      console.error("[ai-usage-breakdown] read failed:", error.message);
    }
    return emptyBreakdown(periodYm);
  }

  const rows: AiUsageAggregationRow[] = (data ?? []).map((row) => ({
    userId: (row.user_id as string | null) ?? null,
    actionType: row.action_type as string,
    success: Boolean(row.success),
    metadata: row.metadata,
  }));

  const byCategory = aggregateUsageByCategory(rows);
  const byMemberRaw = rankUsageByMember(rows);
  const userIds = byMemberRaw
    .map((entry) => entry.userId)
    .filter((id): id is string => Boolean(id));
  const labels = await resolveMemberLabels(trimmed, userIds);

  const byMember: MemberUsageEntryWithLabel[] = byMemberRaw.map((entry) => ({
    ...entry,
    label: entry.userId
      ? labels.get(entry.userId) ?? entry.userId.slice(0, 8)
      : "Unknown member",
  }));

  return { periodYm, byMember, byCategory };
}
