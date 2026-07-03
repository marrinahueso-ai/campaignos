import { createClient } from "@/lib/supabase/server";

const SUPERSEDED_NOTE = "Superseded by duplicate approval request cleanup.";

export async function cancelDuplicatePendingApprovalRequests(
  communicationItemId: string,
  keepRequestId: string,
): Promise<number> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: duplicates, error: fetchError } = await supabase
    .from("approval_requests")
    .select("id")
    .eq("communication_item_id", communicationItemId)
    .eq("status", "pending")
    .neq("id", keepRequestId);

  if (fetchError || !duplicates?.length) {
    return 0;
  }

  const duplicateIds = duplicates.map((row) => row.id as string);

  const { error: updateError } = await supabase
    .from("approval_requests")
    .update({
      status: "rejected",
      resolved_at: now,
      notes: SUPERSEDED_NOTE,
    })
    .in("id", duplicateIds);

  if (updateError) {
    console.error("Failed to cancel duplicate pending approval requests:", {
      communicationItemId,
      keepRequestId,
      error: updateError.message,
    });
    return 0;
  }

  return duplicateIds.length;
}

export async function dedupePendingApprovalRequestsInDb(): Promise<number> {
  const supabase = await createClient();

  const { data: pending, error } = await supabase
    .from("approval_requests")
    .select("id, communication_item_id, requested_at")
    .eq("status", "pending")
    .not("communication_item_id", "is", null)
    .order("requested_at", { ascending: false });

  if (error || !pending?.length) {
    if (error) {
      console.error("Failed to load pending approval requests for dedupe:", error.message);
    }
    return 0;
  }

  const keepIds = new Set<string>();
  const cancelIds: string[] = [];

  for (const row of pending) {
    const itemId = row.communication_item_id as string;
    if (keepIds.has(itemId)) {
      cancelIds.push(row.id as string);
    } else {
      keepIds.add(itemId);
    }
  }

  if (cancelIds.length === 0) {
    return 0;
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("approval_requests")
    .update({
      status: "rejected",
      resolved_at: now,
      notes: SUPERSEDED_NOTE,
    })
    .in("id", cancelIds);

  if (updateError) {
    console.error("Failed to dedupe pending approval requests:", updateError.message);
    return 0;
  }

  return cancelIds.length;
}

type ApprovalQueueDedupeRow = {
  id: string;
  status: string;
  communication_item_id: string | null;
  requested_at: string;
};

export async function resolveStalePendingApprovalRequestsForApprovedItems(): Promise<number> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: pending, error } = await supabase
    .from("approval_requests")
    .select("id, communication_item_id")
    .eq("status", "pending")
    .not("communication_item_id", "is", null);

  if (error || !pending?.length) {
    if (error) {
      console.error(
        "Failed to load pending approval requests for stale cleanup:",
        error.message,
      );
    }
    return 0;
  }

  const itemIds = [
    ...new Set(
      pending
        .map((row) => row.communication_item_id as string)
        .filter(Boolean),
    ),
  ];

  const { data: clearedItems, error: itemsError } = await supabase
    .from("communication_items")
    .select("id")
    .in("id", itemIds)
    .in("status", ["approved", "published"]);

  if (itemsError || !clearedItems?.length) {
    if (itemsError) {
      console.error(
        "Failed to load cleared communication items for stale cleanup:",
        itemsError.message,
      );
    }
    return 0;
  }

  const clearedItemIds = new Set(clearedItems.map((row) => row.id as string));
  const staleRequestIds = pending
    .filter((row) => clearedItemIds.has(row.communication_item_id as string))
    .map((row) => row.id as string);

  if (staleRequestIds.length === 0) {
    return 0;
  }

  const { error: updateError } = await supabase
    .from("approval_requests")
    .update({
      status: "approved",
      resolved_at: now,
    })
    .in("id", staleRequestIds);

  if (updateError) {
    console.error(
      "Failed to resolve stale pending approval requests:",
      updateError.message,
    );
    return 0;
  }

  return staleRequestIds.length;
}

export function dedupePendingApprovalQueueRows<T extends ApprovalQueueDedupeRow>(
  rows: T[],
): T[] {
  const seenPendingItemIds = new Set<string>();
  const deduped: T[] = [];

  for (const row of rows) {
    const itemId = row.communication_item_id;
    if (row.status === "pending" && itemId) {
      if (seenPendingItemIds.has(itemId)) {
        continue;
      }
      seenPendingItemIds.add(itemId);
    }

    deduped.push(row);
  }

  return deduped;
}
