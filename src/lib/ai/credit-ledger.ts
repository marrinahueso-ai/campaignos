import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { assertActiveMembershipInOrganization } from "@/lib/auth/membership-queries";
import {
  isRegenerationMetadata,
  milestoneLabelFromMetadata,
} from "@/lib/ai/usage-breakdown-pure";

export type AiCreditLedgerEntry = {
  id: string;
  entryType: string;
  amount: number;
  bucket: string | null;
  periodYm: string;
  note: string | null;
  createdAt: string;
  /** Member who triggered this entry (burn actor, or grant/adjustment actor). Null for system grants / historical rows logged before attribution. */
  actorUserId: string | null;
  /** Display label for actorUserId — email or a short id fallback. Null when actorUserId is null. */
  actorLabel: string | null;
  /** ai_usage_log.action_type for burn entries, when resolvable. */
  actionType: string | null;
  /** Event this burn's AI action was scoped to, when resolvable. */
  eventTitle: string | null;
  /** Milestone this burn's artwork action targeted, from ai_usage_log.metadata. */
  milestoneLabel: string | null;
  /** True when a burn's artwork action was a regeneration (vs first-time generation). */
  isRegeneration: boolean;
};

type UsageLogJoinRow = {
  id: string;
  actionType: string;
  eventId: string | null;
  milestoneLabel: string | null;
  isRegeneration: boolean;
};

async function resolveUsageLogContext(
  orgId: string,
  aiUsageLogIds: string[],
): Promise<Map<string, UsageLogJoinRow>> {
  const map = new Map<string, UsageLogJoinRow>();
  if (!aiUsageLogIds.length || !isSupabaseAdminConfigured()) return map;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ai_usage_log")
    .select("id, action_type, event_id, metadata")
    .eq("organization_id", orgId)
    .in("id", aiUsageLogIds);

  if (error) {
    console.error("[ai-credit-ledger] usage log join failed:", error.message);
    return map;
  }

  for (const row of data ?? []) {
    map.set(row.id as string, {
      id: row.id as string,
      actionType: row.action_type as string,
      eventId: (row.event_id as string | null) ?? null,
      milestoneLabel: milestoneLabelFromMetadata(row.metadata),
      isRegeneration: isRegenerationMetadata(row.metadata),
    });
  }
  return map;
}

async function resolveEventTitles(
  eventIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!eventIds.length || !isSupabaseAdminConfigured()) return map;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("events")
    .select("id, title")
    .in("id", eventIds);

  if (error) {
    console.error("[ai-credit-ledger] event title lookup failed:", error.message);
    return map;
  }

  for (const row of data ?? []) {
    map.set(row.id as string, (row.title as string) || "Untitled event");
  }
  return map;
}

async function resolveActorLabels(
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
    console.error("[ai-credit-ledger] actor label lookup failed:", error.message);
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
 * Recent AI credit ledger activity for the signed-in member's org, enriched
 * with the acting member's name and (for artwork burns) the source event +
 * milestone context from ai_usage_log.
 *
 * Ledger rows themselves are read with the normal (non-admin) Supabase
 * client so RLS applies — organization_ai_credit_ledger is member-readable
 * via private.is_active_org_member(organization_id). The enrichment lookups
 * (ai_usage_log, events, organization_users) are admin-client-backed since
 * ai_usage_log is service-role only, but they only ever run after confirming
 * the caller has an active membership in `orgId`, and are always additionally
 * scoped to `organization_id = orgId` / ids already returned by the
 * RLS-scoped ledger read — never a general cross-org query.
 *
 * Historical caveat: burn rows recorded before this change (or before the
 * artwork userId/metadata fix) have no actor, milestone, or regeneration
 * info — those fields are null/false, not a bug.
 */
export async function getOrgAiCreditLedgerRecent(
  orgId: string,
  limit = 20,
): Promise<AiCreditLedgerEntry[]> {
  const trimmed = orgId?.trim();
  if (!trimmed) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_ai_credit_ledger")
    .select("id, entry_type, amount, bucket, period_ym, note, created_at, actor_user_id, ai_usage_log_id")
    .eq("organization_id", trimmed)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (error.code !== "42P01") {
      console.error("[ai-credit-ledger] recent read failed:", error.message);
    }
    return [];
  }

  const rows = data ?? [];
  if (rows.length === 0) return [];

  const allowed = await assertActiveMembershipInOrganization(trimmed);
  if (!allowed) return [];

  const aiUsageLogIds = [
    ...new Set(
      rows
        .map((row) => row.ai_usage_log_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const actorUserIds = [
    ...new Set(
      rows
        .map((row) => row.actor_user_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const usageContext = await resolveUsageLogContext(trimmed, aiUsageLogIds);
  const eventIds = [
    ...new Set(
      [...usageContext.values()]
        .map((entry) => entry.eventId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const [eventTitles, actorLabels] = await Promise.all([
    resolveEventTitles(eventIds),
    resolveActorLabels(trimmed, actorUserIds),
  ]);

  return rows.map((row) => {
    const actorUserId = (row.actor_user_id as string | null) ?? null;
    const usage = row.ai_usage_log_id
      ? usageContext.get(row.ai_usage_log_id as string) ?? null
      : null;

    return {
      id: row.id as string,
      entryType: row.entry_type as string,
      amount: Number(row.amount) || 0,
      bucket: (row.bucket as string | null) ?? null,
      periodYm: (row.period_ym as string | null) ?? "",
      note: (row.note as string | null) ?? null,
      createdAt: row.created_at as string,
      actorUserId,
      actorLabel: actorUserId ? actorLabels.get(actorUserId) ?? actorUserId.slice(0, 8) : null,
      actionType: usage?.actionType ?? null,
      eventTitle: usage?.eventId ? eventTitles.get(usage.eventId) ?? null : null,
      milestoneLabel: usage?.milestoneLabel ?? null,
      isRegeneration: usage?.isRegeneration ?? false,
    };
  });
}
