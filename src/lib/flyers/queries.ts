import "server-only";

import type {
  Flyer,
  FlyerComposerState,
  FlyerPrintSize,
  FlyerRow,
  FlyerStatus,
} from "@/lib/flyers/types";
import { isFlyerPrintSize } from "@/lib/flyers/types";
import { createClient } from "@/lib/supabase/server";

const FLYER_STATUSES = new Set<FlyerStatus>([
  "draft",
  "needs_approval",
  "changes_requested",
  "approved",
]);

function asFlyerStatus(value: unknown): FlyerStatus {
  return FLYER_STATUSES.has(value as FlyerStatus)
    ? (value as FlyerStatus)
    : "draft";
}

function asPrintSize(value: unknown): FlyerPrintSize {
  return typeof value === "string" && isFlyerPrintSize(value) ? value : "letter";
}

export function mapFlyerRow(row: FlyerRow): Flyer {
  return {
    id: row.id,
    organizationId: row.organization_id,
    eventId: row.event_id,
    title: row.title,
    status: asFlyerStatus(row.status),
    printSize: asPrintSize(row.print_size),
    composerState: (row.composer_state ?? {}) as FlyerComposerState,
    previewImageUrl: row.preview_image_url,
    approvalSchedulingItemId: row.approval_scheduling_item_id,
    changeRequestNote: row.change_request_note,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    submittedBy: row.submitted_by,
    approvedBy: row.approved_by,
    submittedAt: row.submitted_at,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listFlyersForOrg(organizationId: string): Promise<Flyer[]> {
  const supabase = await createClient();
  // Library cards use preview_image_url + metadata — omit composer_state JSONB.
  const { data, error } = await supabase
    .from("flyers")
    .select(
      "id, organization_id, event_id, title, status, print_size, preview_image_url, approval_scheduling_item_id, change_request_note, created_by, updated_by, submitted_by, approved_by, submitted_at, approved_at, created_at, updated_at",
    )
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Failed to list flyers:", error.message);
    return [];
  }
  return (data ?? []).map((row) =>
    mapFlyerRow({
      ...(row as Omit<FlyerRow, "composer_state">),
      composer_state: {},
    } as FlyerRow),
  );
}

export async function getFlyerById(
  organizationId: string,
  flyerId: string,
): Promise<Flyer | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("flyers")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", flyerId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return mapFlyerRow(data as FlyerRow);
}
