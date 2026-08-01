import type { RevisionWorkspaceModel } from "@/components/approvals-revision/types";

/** Exact mockup sample — used when `?demo=1` for pixel QA. */
export const REVISION_DEMO_CREATOR: RevisionWorkspaceModel = {
  itemId: "demo",
  mode: "creator",
  contentType: "social",
  typeChip: "Social · Feed + Story",
  statusChip: "Changes requested",
  statusKind: "changes",
  contextLine: "Fall Festival — Milestone 2",
  title: "Update this post",
  previewTitle: "Fall Festival",
  previewSubtitle: "Sat Aug 12 · Sign up →",
  /** Primary fallback; UI prefers feedArtworkUrl + storyArtworkUrl. */
  previewImageUrl:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%231a3a4a'/%3E%3Cstop offset='.55' stop-color='%232f6b5a'/%3E%3Cstop offset='1' stop-color='%23c4922e'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='400' fill='url(%23g)'/%3E%3Ctext x='50%25' y='48%25' fill='%23fffcf7' font-family='Georgia,serif' font-size='28' text-anchor='middle'%3EFeed 1%3A1%3C/text%3E%3C/svg%3E",
  previewFootnote: "",
  captionText:
    "Join us for Fall Festival on Aug 5! Volunteers welcome — sign up today.",
  feedArtworkUrl:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%231a3a4a'/%3E%3Cstop offset='.55' stop-color='%232f6b5a'/%3E%3Cstop offset='1' stop-color='%23c4922e'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='400' fill='url(%23g)'/%3E%3Ctext x='50%25' y='48%25' fill='%23fffcf7' font-family='Georgia,serif' font-size='28' text-anchor='middle'%3EFeed 1%3A1%3C/text%3E%3C/svg%3E",
  storyArtworkUrl:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='360' height='640'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%232a7a86'/%3E%3Cstop offset='.6' stop-color='%232f4a3c'/%3E%3Cstop offset='1' stop-color='%23c4922e'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='360' height='640' fill='url(%23g)'/%3E%3Ctext x='50%25' y='48%25' fill='%23fffcf7' font-family='Georgia,serif' font-size='26' text-anchor='middle'%3EStory 9%3A16%3C/text%3E%3C/svg%3E",
  scheduleAt: null,
  scheduleDate: "2026-08-12",
  scheduleTime: "09:00",
  initialScheduleLabel: "Aug 12",
  noteWho: "Jamie · VP Communications · Jul 27",
  noteBody:
    "Can we warm up the headline and move the date to Aug 12? Logo feels small.",
  revisionTags: ["Artwork", "Date"],
  checklist: [
    {
      id: "art",
      tag: "Artwork",
      title: "Artwork",
      detail: "Headline + logo size",
      done: true,
    },
    {
      id: "date",
      tag: "Date",
      title: "Date",
      detail: "Aug 5 → Aug 12",
      done: true,
    },
    {
      id: "caption",
      tag: "Caption",
      title: "Caption",
      detail: "Optional — match new date",
      done: false,
    },
  ],
  timeline: [
    { label: "Sent for approval", actor: "You", when: "Jul 26" },
    {
      label: "Changes requested",
      actor: "Jamie",
      when: "Jul 27 — note above",
    },
    { label: "Edits in progress", actor: "You", when: "now" },
  ],
  editArtworkHref: null,
  changeDateHref: null,
  backHref: "/approvals",
  eventId: "demo-event",
  campaignName: "Fall Festival",
  milestoneName: "Milestone 2",
  schedulingItemId: null,
  communicationItemId: null,
  campaignMilestoneId: null,
  isDemo: true,
};

export const REVISION_DEMO_APPROVER: RevisionWorkspaceModel = {
  ...REVISION_DEMO_CREATOR,
  mode: "approver",
  statusChip: "Needs your review",
  statusKind: "review",
  title: "Request changes",
  previewSubtitle: "Sat Aug 5 · Sign up →",
  checklist: [],
  timeline: [{ label: "Sent for approval", actor: "Creator", when: "Jul 26" }],
};
