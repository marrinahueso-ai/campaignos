import type {
  MetaPublicationSlot,
  MetaPublicationSlotRow,
} from "@/lib/meta-publishing/types";

export function mapMetaPublicationSlotRow(row: MetaPublicationSlotRow): MetaPublicationSlot {
  return {
    id: row.id,
    eventId: row.event_id,
    relativeDay: row.relative_day,
    milestoneTitle: row.milestone_title,
    platform: row.platform,
    placement: row.placement,
    eventAssetId: row.event_asset_id,
    communicationItemId: row.communication_item_id,
    scheduledFor: row.scheduled_for,
    status: row.status,
    externalPostId: row.external_post_id ?? null,
    publishError: row.publish_error ?? null,
    publishedAt: row.published_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
