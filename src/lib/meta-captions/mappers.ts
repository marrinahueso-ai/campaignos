import type { MetaSocialCaption, MetaSocialCaptionRow } from "@/lib/meta-captions/types";

export function mapMetaSocialCaptionRow(row: MetaSocialCaptionRow): MetaSocialCaption {
  return {
    id: row.id,
    eventId: row.event_id,
    relativeDay: row.relative_day,
    milestoneTitle: row.milestone_title,
    placement: row.placement,
    content: row.content,
    status: row.status ?? "draft",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
