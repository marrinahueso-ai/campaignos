import type { RevisionWorkspaceModel } from "@/components/approvals-revision/types";
import type { RevisionMode } from "@/components/approvals-revision/types";
import {
  campaignBuilderEditArtworkHref,
  campaignBuilderHref,
  campaignBuilderPreviewMilestoneHref,
} from "@/lib/campaign-builder-v2/navigation";
import {
  checklistFromTags,
  parseRevisionNotes,
} from "@/lib/approvals-revision/revision-notes";
import type { UnifiedApprovalItem } from "@/lib/approvals-scheduling/types";

function platformChip(item: UnifiedApprovalItem): string {
  const feed = Boolean(item.preview.feedArtworkUrl);
  const story = Boolean(item.preview.storyArtworkUrl);
  if (feed && story) return "Social · Feed + Story";
  if (feed && !story) return "Social · Feed";
  if (story && !feed) return "Social · Story";
  if (item.platforms.includes("email")) return "Social · Email";
  if (item.platforms.length > 0) {
    return `Social · ${item.platforms[0]}`;
  }
  return "Social";
}

import {
  isoToLocalDateOnly,
  readLocalTimeFromIso,
} from "@/lib/utils/dates";

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Maps a live approval item into the Revision shell model.
 */
export function mapApprovalItemToRevision(
  item: UnifiedApprovalItem,
  mode: RevisionMode,
): RevisionWorkspaceModel {
  const imageUrl =
    item.preview.feedArtworkUrl ||
    item.preview.storyArtworkUrl ||
    item.thumbnailUrl;
  const parsedNotes = parseRevisionNotes(item.notes);
  const noteBody =
    parsedNotes.comment ||
    "Your approver asked for updates. Make the edits below, then send for re-approval.";
  const noteWho = `${item.assigneeName || "Approver"}${
    item.assigneeRole ? ` · ${item.assigneeRole}` : ""
  }`;

  const editArtworkHref =
    item.eventId && item.campaignMilestoneId
      ? campaignBuilderEditArtworkHref(
          item.eventId,
          item.campaignMilestoneId,
        )
      : item.eventId
        ? campaignBuilderHref(item.eventId, "preview")
        : null;

  const changeDateHref =
    item.eventId && item.campaignMilestoneId
      ? campaignBuilderPreviewMilestoneHref(
          item.eventId,
          item.campaignMilestoneId,
        )
      : null;

  const timeline = item.approvalHistory.map((entry) => ({
    label: entry.label,
    actor: entry.actor,
    when: formatWhen(entry.timestamp) || entry.timestamp,
  }));

  if (timeline.length === 0) {
    timeline.push({
      label:
        mode === "creator" ? "Changes requested" : "Sent for approval",
      actor: mode === "creator" ? item.assigneeName || "Approver" : "You",
      when: formatWhen(item.requestedAt) || "—",
    });
  }

  const scheduleDate = item.scheduleAt
    ? isoToLocalDateOnly(item.scheduleAt)
    : null;
  const scheduleTime = item.scheduleAt
    ? readLocalTimeFromIso(item.scheduleAt)
    : null;

  return {
    itemId: item.id,
    mode,
    contentType: "social",
    typeChip: platformChip(item),
    statusChip:
      mode === "creator" ? "Changes requested" : "Needs your review",
    statusKind: mode === "creator" ? "changes" : "review",
    contextLine: `${item.campaignName} · ${item.milestoneName}`,
    title: mode === "creator" ? "Revision workspace" : "Request changes",
    previewTitle: item.campaignName,
    previewSubtitle: item.scheduleLabel || item.milestoneName,
    previewImageUrl: imageUrl,
    previewFootnote: "",
    captionText: item.preview.captionText,
    feedArtworkUrl: item.preview.feedArtworkUrl,
    storyArtworkUrl: item.preview.storyArtworkUrl,
    scheduleAt: item.scheduleAt,
    scheduleDate,
    scheduleTime,
    initialScheduleLabel: item.scheduleLabel,
    noteWho,
    noteBody,
    revisionTags: parsedNotes.tags,
    checklist:
      mode === "creator"
        ? checklistFromTags(parsedNotes.tags, item.scheduleLabel)
        : [],
    timeline,
    editArtworkHref,
    changeDateHref,
    backHref: "/approvals",
    eventId: item.eventId,
    campaignName: item.campaignName,
    milestoneName: item.milestoneName,
    schedulingItemId: item.schedulingItemId,
    communicationItemId: item.communicationItemId,
    campaignMilestoneId: item.campaignMilestoneId,
    isDemo: false,
  };
}

export function revisionPath(
  itemId: string,
  mode: RevisionMode,
): string {
  const params = new URLSearchParams({ itemId, mode });
  return `/approvals/revision?${params.toString()}`;
}
