/**
 * Pure AI usage aggregation helpers (safe for unit tests — no server-only,
 * no Supabase client). Mirrors the capacity-usage / capacity-usage-pure
 * split: DB-touching code (usage-breakdown.ts) delegates all math here.
 */

import type { AiActionType } from "@/lib/ai/types";
import { creditCostForAction } from "@/lib/ai/credit-constants";

/** Every category the Usage tab's "by category" breakdown can show. */
export type AiUsageCategoryKey =
  | "artwork_generation"
  | "artwork_regeneration"
  | "meta_social_caption"
  | "ask_ralli"
  | "tasks_generate"
  | "inbox_ai"
  | "calendar_import_parse"
  | "playbook_insights"
  | "draft_communication"
  | "generate_event_brief"
  | "generate_creative_brief"
  | "other";

/**
 * action_type → category label. `generate_artwork` / `orchestrate_artwork`
 * are NOT listed here — they're split into artwork_generation /
 * artwork_regeneration via metadata.isRegeneration in categoryKeyForRow.
 * `orchestrate_artwork` groups under "Artwork Generation" (it's the
 * prompt-orchestration sub-step of the same artwork pipeline).
 */
export const AI_USAGE_CATEGORY_LABELS: Record<AiUsageCategoryKey, string> = {
  artwork_generation: "Artwork Generation",
  artwork_regeneration: "Artwork Regeneration",
  meta_social_caption: "Caption Count",
  ask_ralli: "Ask Ralli",
  tasks_generate: "Task Assistant",
  inbox_ai: "Inbox AI",
  calendar_import_parse: "Calendar Import",
  playbook_insights: "Playbook Insights",
  draft_communication: "Communication Draft",
  generate_event_brief: "Event Brief",
  generate_creative_brief: "Creative Brief",
  other: "Etc",
};

/** Display order for the Usage tab's "by category" list. */
export const AI_USAGE_CATEGORY_ORDER: AiUsageCategoryKey[] = [
  "artwork_generation",
  "artwork_regeneration",
  "meta_social_caption",
  "ask_ralli",
  "tasks_generate",
  "inbox_ai",
  "calendar_import_parse",
  "playbook_insights",
  "draft_communication",
  "generate_event_brief",
  "generate_creative_brief",
  "other",
];

const ARTWORK_ACTION_TYPES = new Set<string>(["generate_artwork", "orchestrate_artwork"]);

const DIRECT_CATEGORY_MAP: Partial<Record<string, AiUsageCategoryKey>> = {
  meta_social_caption: "meta_social_caption",
  ask_ralli: "ask_ralli",
  tasks_generate: "tasks_generate",
  inbox_ai: "inbox_ai",
  calendar_import_parse: "calendar_import_parse",
  playbook_insights: "playbook_insights",
  draft_communication: "draft_communication",
  generate_event_brief: "generate_event_brief",
  generate_creative_brief: "generate_creative_brief",
};

export function isRegenerationMetadata(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  const value = (metadata as Record<string, unknown>).isRegeneration;
  return value === true;
}

export function milestoneLabelFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const value = (metadata as Record<string, unknown>).milestoneLabel;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function relativeDayFromMetadata(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== "object") return null;
  const value = (metadata as Record<string, unknown>).relativeDay;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Minimal shape aggregation needs from an ai_usage_log row. */
export type AiUsageAggregationRow = {
  userId: string | null;
  actionType: string;
  success: boolean;
  metadata?: unknown;
};

export function categoryKeyForRow(row: AiUsageAggregationRow): AiUsageCategoryKey {
  if (ARTWORK_ACTION_TYPES.has(row.actionType)) {
    return isRegenerationMetadata(row.metadata) ? "artwork_regeneration" : "artwork_generation";
  }
  return DIRECT_CATEGORY_MAP[row.actionType] ?? "other";
}

export function categoryLabelForActionType(
  actionType: string,
  isRegeneration = false,
): string {
  const key = ARTWORK_ACTION_TYPES.has(actionType)
    ? isRegeneration
      ? "artwork_regeneration"
      : "artwork_generation"
    : DIRECT_CATEGORY_MAP[actionType] ?? "other";
  return AI_USAGE_CATEGORY_LABELS[key];
}

/** Single-line "Recent activity" description for a ledger entry — used by BillingUsagePanel. */
export function ledgerActivityDescription(entry: {
  actorLabel: string | null;
  actionType: string | null;
  isRegeneration: boolean;
  eventTitle: string | null;
  milestoneLabel: string | null;
  note: string | null;
}): string {
  if (entry.actionType) {
    const segments = [
      entry.actorLabel,
      categoryLabelForActionType(entry.actionType, entry.isRegeneration),
    ];
    if (entry.eventTitle) {
      segments.push(
        entry.milestoneLabel ? `${entry.eventTitle} · ${entry.milestoneLabel}` : entry.eventTitle,
      );
    }
    return segments.filter(Boolean).join(" — ");
  }

  const segments = [entry.actorLabel, entry.note].filter(Boolean);
  return segments.length > 0 ? segments.join(" — ") : "—";
}

function creditsForRow(row: AiUsageAggregationRow): number {
  return creditCostForAction(row.actionType as AiActionType, row.success);
}

export type CategoryUsageEntry = {
  key: AiUsageCategoryKey;
  label: string;
  count: number;
  credits: number;
};

/**
 * Every category always appears (count 0 if unused this period) so the
 * breakdown reads as a complete list of "everywhere Hey Ralli uses OpenAI",
 * not just whichever categories happened to fire.
 */
export function aggregateUsageByCategory(
  rows: AiUsageAggregationRow[],
): CategoryUsageEntry[] {
  const byKey = new Map<AiUsageCategoryKey, { count: number; credits: number }>();
  for (const key of AI_USAGE_CATEGORY_ORDER) {
    byKey.set(key, { count: 0, credits: 0 });
  }

  for (const row of rows) {
    const key = categoryKeyForRow(row);
    const entry = byKey.get(key) ?? { count: 0, credits: 0 };
    entry.count += 1;
    entry.credits += creditsForRow(row);
    byKey.set(key, entry);
  }

  return AI_USAGE_CATEGORY_ORDER.map((key) => ({
    key,
    label: AI_USAGE_CATEGORY_LABELS[key],
    count: byKey.get(key)?.count ?? 0,
    credits: byKey.get(key)?.credits ?? 0,
  }));
}

export type MemberUsageEntry = {
  /** null = actions with no attributed user (e.g. historical artwork rows before this change). */
  userId: string | null;
  count: number;
  credits: number;
};

/**
 * Ranks members by credits burned (weighted — an 8-credit artwork gen counts
 * far more than a 1-credit text action), descending. Ties broken by action
 * count, then by userId for a stable order. Rows with no userId are grouped
 * under a single `userId: null` entry (historical / unattributed usage) —
 * callers should label this "Unknown member" and typically exclude it from
 * "top member" framing.
 */
export function rankUsageByMember(rows: AiUsageAggregationRow[]): MemberUsageEntry[] {
  const byUser = new Map<string | null, { count: number; credits: number }>();

  for (const row of rows) {
    const key = row.userId ?? null;
    const entry = byUser.get(key) ?? { count: 0, credits: 0 };
    entry.count += 1;
    entry.credits += creditsForRow(row);
    byUser.set(key, entry);
  }

  return [...byUser.entries()]
    .map(([userId, entry]) => ({ userId, count: entry.count, credits: entry.credits }))
    .sort((a, b) => {
      if (b.credits !== a.credits) return b.credits - a.credits;
      if (b.count !== a.count) return b.count - a.count;
      return (a.userId ?? "").localeCompare(b.userId ?? "");
    });
}
