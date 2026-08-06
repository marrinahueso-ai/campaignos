import "server-only";

import { milestoneNameMatchKey } from "@/lib/campaign-builder-v2/milestone-names";
import type { UnifiedWorkflowStatus } from "@/lib/approvals-scheduling/types";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type SchedulingPublishOutcome = "published" | "failed";

/**
 * Keep Approvals scheduling rows aligned with Meta slot publish outcomes.
 * Matches by communication item id first, then post title.
 */
export async function syncSchedulingItemsForMetaPublishOutcome(input: {
  eventId: string;
  relativeDay: number;
  milestoneTitle?: string | null;
  outcome: SchedulingPublishOutcome;
  errorMessage?: string | null;
}): Promise<void> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: slots } = await supabase
    .from("meta_publication_slots")
    .select("communication_item_id, milestone_title")
    .eq("event_id", input.eventId)
    .eq("relative_day", input.relativeDay);

  const communicationIds = [
    ...new Set(
      (slots ?? [])
        .map((slot) => slot.communication_item_id)
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  const titleKey = milestoneNameMatchKey(
    input.milestoneTitle ?? slots?.[0]?.milestone_title ?? "",
  );

  const { data: rows, error } = await supabase
    .from("approval_scheduling_items")
    .select("id, communication_item_id, milestone_name, workflow_status, delivery_method")
    .eq("event_id", input.eventId)
    .in("workflow_status", ["scheduled", "posted", "published", "failed"]);

  if (error || !rows?.length) {
    return;
  }

  const matched = rows.filter((row) => {
    if (
      row.communication_item_id &&
      communicationIds.includes(row.communication_item_id)
    ) {
      return true;
    }
    if (!titleKey) {
      return false;
    }
    return milestoneNameMatchKey(String(row.milestone_name ?? "")) === titleKey;
  });

  if (matched.length === 0) {
    return;
  }

  for (const row of matched) {
    // Draft-only stays Draft (scheduled) — never claim Posted without Meta.
    if (
      row.delivery_method === "draft-only" &&
      input.outcome === "published"
    ) {
      continue;
    }

    const nextStatus =
      input.outcome === "published" ? "published" : "failed";
    if (row.workflow_status === nextStatus && input.outcome === "published") {
      continue;
    }

    await supabase
      .from("approval_scheduling_items")
      .update({
        workflow_status: nextStatus,
        notes:
          input.outcome === "failed"
            ? (input.errorMessage?.trim() ||
              "Couldn’t post to your Page. Try again.")
            : null,
        resolved_at: now,
        updated_at: now,
      })
      .eq("id", row.id);
  }
}

export type MetaSlotOutcomeRow = {
  eventId: string;
  relativeDay: number;
  milestoneTitle: string;
  communicationItemId: string | null;
  status: "failed" | "published";
  publishError: string | null;
};

/** Lean Meta slot outcomes for Approvals overlay (failed + published only). */
export async function loadMetaSlotOutcomesForEvents(
  eventIds: string[],
): Promise<MetaSlotOutcomeRow[]> {
  const uniqueIds = [...new Set(eventIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meta_publication_slots")
    .select(
      "event_id, relative_day, milestone_title, communication_item_id, status, publish_error",
    )
    .in("event_id", uniqueIds)
    .in("status", ["failed", "published"]);

  if (error || !data) {
    if (error) {
      console.error(
        "Failed to load Meta slot outcomes for Approvals:",
        error.message,
      );
    }
    return [];
  }

  return data.map((row) => ({
    eventId: String(row.event_id),
    relativeDay: Number(row.relative_day),
    milestoneTitle: String(row.milestone_title ?? ""),
    communicationItemId: (row.communication_item_id as string | null) ?? null,
    status: row.status as "failed" | "published",
    publishError: (row.publish_error as string | null) ?? null,
  }));
}

export function applyMetaSlotOutcomesToApprovalItem<
  T extends {
    eventId: string;
    milestoneName: string;
    communicationItemId: string | null;
    workflowStatus: UnifiedWorkflowStatus;
    deliveryMethod: string | null;
    metaRelativeDay: number | null;
    publishError: string | null;
    statusDetail: string;
    nextAction: string;
  },
>(item: T, outcomes: MetaSlotOutcomeRow[]): T {
  if (
    item.workflowStatus !== "scheduled" &&
    item.workflowStatus !== "posted" &&
    item.workflowStatus !== "published" &&
    item.workflowStatus !== "failed"
  ) {
    return item;
  }

  if (item.deliveryMethod === "draft-only") {
    return item;
  }

  const milestoneKey = milestoneNameMatchKey(item.milestoneName);
  const matched = outcomes.filter((outcome) => {
    if (outcome.eventId !== item.eventId) {
      return false;
    }
    if (
      item.communicationItemId &&
      outcome.communicationItemId === item.communicationItemId
    ) {
      return true;
    }
    return milestoneNameMatchKey(outcome.milestoneTitle) === milestoneKey;
  });

  if (matched.length === 0) {
    return item;
  }

  const relativeDay = matched[0]?.relativeDay ?? null;
  const hasFailed = matched.some((entry) => entry.status === "failed");
  const allPublished = matched.every((entry) => entry.status === "published");
  const failedError =
    matched.find((entry) => entry.status === "failed")?.publishError ?? null;

  if (hasFailed) {
    return {
      ...item,
      workflowStatus: "failed",
      metaRelativeDay: relativeDay,
      publishError:
        failedError?.trim() || "Couldn’t post to your Page. Try again.",
      statusDetail: "Couldn’t post — retry when ready",
      nextAction: "Retry",
    };
  }

  if (allPublished && item.workflowStatus !== "published") {
    return {
      ...item,
      workflowStatus: "published",
      metaRelativeDay: relativeDay,
      publishError: null,
      statusDetail: "Live on your Page",
      nextAction: "Posted",
    };
  }

  return {
    ...item,
    metaRelativeDay: relativeDay ?? item.metaRelativeDay,
  };
}

const ORPHAN_SCHEDULE_GRACE_MS = 15 * 60 * 1000;
const ACTIVE_META_SLOT_STATUSES = [
  "approved",
  "scheduled",
  "posting",
  "published",
] as const;

export type OrphanScheduledReconcileResult = {
  scanned: number;
  markedFailed: number;
  errors: string[];
};

/**
 * Mark schedule/publish-now Approvals rows that claim to be scheduled but have
 * no Meta slots that can ever publish. Prevents infinite "Scheduled" orphans
 * after approve-side Meta mapping failures or lost slots.
 */
export async function reconcileOrphanScheduledApprovals(options?: {
  now?: Date;
  graceMs?: number;
}): Promise<OrphanScheduledReconcileResult> {
  const result: OrphanScheduledReconcileResult = {
    scanned: 0,
    markedFailed: 0,
    errors: [],
  };

  if (!isSupabaseAdminConfigured()) {
    result.errors.push(
      "SUPABASE_SERVICE_ROLE_KEY is not configured; cannot reconcile orphan scheduled approvals.",
    );
    return result;
  }

  const supabase = createAdminClient();
  const now = options?.now ?? new Date();
  const graceMs = options?.graceMs ?? ORPHAN_SCHEDULE_GRACE_MS;
  const cutoffIso = new Date(now.getTime() - graceMs).toISOString();

  const { data: rows, error } = await supabase
    .from("approval_scheduling_items")
    .select(
      "id, event_id, milestone_name, delivery_method, schedule_at, updated_at, resolved_at",
    )
    .eq("workflow_status", "scheduled")
    .in("delivery_method", ["schedule", "publish-now", "auto-publish"])
    .lt("updated_at", cutoffIso);

  if (error) {
    result.errors.push(error.message);
    return result;
  }

  const candidates = rows ?? [];
  result.scanned = candidates.length;
  if (candidates.length === 0) {
    return result;
  }

  const eventIds = [...new Set(candidates.map((row) => String(row.event_id)))];
  const { data: slots, error: slotError } = await supabase
    .from("meta_publication_slots")
    .select("event_id, milestone_title, status")
    .in("event_id", eventIds)
    .in("status", [...ACTIVE_META_SLOT_STATUSES]);

  if (slotError) {
    result.errors.push(slotError.message);
    return result;
  }

  const activeKeys = new Set(
    (slots ?? []).map(
      (slot) =>
        `${slot.event_id}:${milestoneNameMatchKey(String(slot.milestone_title ?? ""))}`,
    ),
  );

  const failNote =
    "Couldn’t queue this post for Meta publishing. Open Failed to retry, or reconnect Meta in Settings.";
  const nowIso = now.toISOString();

  for (const row of candidates) {
    const key = `${row.event_id}:${milestoneNameMatchKey(String(row.milestone_name ?? ""))}`;
    if (activeKeys.has(key)) {
      continue;
    }

    const { error: updateError } = await supabase
      .from("approval_scheduling_items")
      .update({
        workflow_status: "failed",
        notes: failNote,
        resolved_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", row.id)
      .eq("workflow_status", "scheduled");

    if (updateError) {
      result.errors.push(`${row.id}: ${updateError.message}`);
      continue;
    }

    result.markedFailed += 1;
  }

  return result;
}
