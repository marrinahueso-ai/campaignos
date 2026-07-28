/** Content adapters — social first; grow without new UX shells. */
export type RevisionContentType =
  | "social"
  | "newsletter"
  | "flyer"
  | "homepage"
  | "website";

export type RevisionMode = "creator" | "approver";

export type RevisionTag =
  | "Artwork"
  | "Date"
  | "Caption"
  | "Copy"
  | "Subject"
  | "Stories"
  | "Preview"
  | "Links";

export interface RevisionChecklistItem {
  id: string;
  tag: RevisionTag;
  title: string;
  detail: string;
  done: boolean;
}

export interface RevisionTimelineEntry {
  label: string;
  actor: string;
  when: string;
}

export interface RevisionWorkspaceModel {
  itemId: string;
  mode: RevisionMode;
  contentType: RevisionContentType;
  typeChip: string;
  statusChip: string;
  statusKind: "changes" | "review";
  contextLine: string;
  title: string;
  previewTitle: string;
  previewSubtitle: string;
  previewImageUrl: string | null;
  previewFootnote: string;
  /** Live caption shown under artwork preview. */
  captionText: string | null;
  feedArtworkUrl: string | null;
  storyArtworkUrl: string | null;
  scheduleAt: string | null;
  scheduleDate: string | null;
  scheduleTime: string | null;
  initialScheduleLabel: string | null;
  noteWho: string;
  noteBody: string;
  /** Tags from the latest change request (approver). */
  revisionTags: RevisionTag[];
  checklist: RevisionChecklistItem[];
  timeline: RevisionTimelineEntry[];
  editArtworkHref: string | null;
  changeDateHref: string | null;
  backHref: string;
  /** Action wiring */
  eventId: string;
  campaignName: string;
  milestoneName: string;
  schedulingItemId: string | null;
  communicationItemId: string | null;
  campaignMilestoneId: string | null;
  isDemo: boolean;
}
