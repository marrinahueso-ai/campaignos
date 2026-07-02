export type CalmStatusKey =
  | "draft"
  | "needs_review"
  | "approved"
  | "scheduled"
  | "published"
  | "overdue";

export interface CalmStatusStyle {
  bg: string;
  text: string;
  border: string;
}

/** Calm status mapping — sage, sand, espresso, terracotta. */
export const CALM_STATUS_STYLES: Record<CalmStatusKey, CalmStatusStyle> = {
  draft: {
    bg: "bg-cos-bg-alt",
    text: "text-cos-muted",
    border: "border-cos-border",
  },
  needs_review: {
    bg: "bg-cos-warning",
    text: "text-cos-warning-text",
    border: "border-cos-border",
  },
  approved: {
    bg: "bg-cos-accent-soft",
    text: "text-cos-text",
    border: "border-cos-border",
  },
  scheduled: {
    bg: "bg-cos-accent-soft",
    text: "text-cos-text",
    border: "border-cos-border",
  },
  published: {
    bg: "bg-cos-success-bg",
    text: "text-cos-success-text",
    border: "border-cos-border",
  },
  overdue: {
    bg: "bg-cos-error-bg",
    text: "text-cos-error-text",
    border: "border-cos-border",
  },
};

export const CALM_STATUS_LABELS: Record<CalmStatusKey, string> = {
  draft: "Draft",
  needs_review: "Needs review",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
  overdue: "Overdue",
};
