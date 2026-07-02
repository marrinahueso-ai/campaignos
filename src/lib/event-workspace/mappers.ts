import type {
  ActivityLogEntry,
  ActivityLogRow,
  ApprovalRequest,
  ApprovalRequestRow,
  CommunicationItem,
  CommunicationItemRow,
  CommunicationVersionRow,
  EventAsset,
  EventAssetRow,
  PublicationScheduleItem,
  PublicationScheduleRow,
} from "@/types/event-workspace";
import {
  parseAiReview,
  parseInspirationMatch,
} from "@/lib/creative-director/mappers";
import { parseGenerationSettings } from "@/lib/ai-artwork/settings";

export function mapEventAssetRow(row: EventAssetRow): EventAsset {
  const tags = Array.isArray(row.tags) ? row.tags : [];

  return {
    id: row.id,
    eventId: row.event_id,
    assetType: row.asset_type,
    filename: row.filename,
    storagePath: row.storage_path,
    status: row.status,
    aiGenerated: row.ai_generated,
    uploadedBy: row.uploaded_by ?? null,
    currentVersion:
      typeof row.current_version === "number" && row.current_version > 0
        ? row.current_version
        : 1,
    tags,
    isFavorite: row.is_favorite ?? false,
    canvaUrl: row.canva_url ?? null,
    isCustom: row.is_custom ?? false,
    planStatus: row.plan_status ?? null,
    planLabel: row.plan_label ?? null,
    generationPrompt: row.generation_prompt ?? null,
    aiReview: parseAiReview(row.ai_review),
    inspirationMatch: parseInspirationMatch(row.inspiration_match),
    generationSettings: parseGenerationSettings(row.generation_settings),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapEventAssetRows(rows: EventAssetRow[]): EventAsset[] {
  return rows.map(mapEventAssetRow);
}

export function mapCommunicationItemRow(
  row: CommunicationItemRow,
  latestContent: string | null = null,
): CommunicationItem {
  return {
    id: row.id,
    eventId: row.event_id,
    channel: row.channel,
    eventCommunicationStepId: row.event_communication_step_id ?? null,
    status: row.status,
    lastUpdated: row.last_updated,
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    latestContent,
  };
}

export function mapApprovalRequestRow(
  row: ApprovalRequestRow,
  assigneeDisplayName: string | null = null,
): ApprovalRequest {
  return {
    id: row.id,
    eventId: row.event_id,
    communicationItemId: row.communication_item_id,
    communicationVersionId: row.communication_version_id ?? null,
    status: row.status,
    requestedAt: row.requested_at,
    resolvedAt: row.resolved_at,
    notes: row.notes,
    assignedOrganizationRoleId: row.assigned_organization_role_id ?? null,
    assignedUserId: row.assigned_user_id ?? null,
    requestedByUserId: row.requested_by_user_id ?? null,
    assigneeDisplayName,
    createdAt: row.created_at,
  };
}

export function mapPublicationScheduleRow(
  row: PublicationScheduleRow,
): PublicationScheduleItem {
  return {
    id: row.id,
    eventId: row.event_id,
    communicationItemId: row.communication_item_id,
    scheduledFor: row.scheduled_for,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapActivityLogRow(row: ActivityLogRow): ActivityLogEntry {
  return {
    id: row.id,
    eventId: row.event_id,
    activityType: row.activity_type,
    title: row.title,
    description: row.description,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
  };
}

export function mapActivityLogRows(rows: ActivityLogRow[]): ActivityLogEntry[] {
  return rows.map(mapActivityLogRow);
}

export function mapLatestContentByItemId(
  versions: CommunicationVersionRow[],
): Map<string, string> {
  const latest = new Map<string, { versionNumber: number; content: string }>();

  for (const version of versions) {
    const existing = latest.get(version.communication_item_id);
    if (!existing || version.version_number > existing.versionNumber) {
      latest.set(version.communication_item_id, {
        versionNumber: version.version_number,
        content: version.content,
      });
    }
  }

  const contentByItemId = new Map<string, string>();
  for (const [itemId, entry] of latest) {
    contentByItemId.set(itemId, entry.content);
  }

  return contentByItemId;
}
