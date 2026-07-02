import type { CalendarMode, CalendarView } from "@/types/communications-calendar";

export const CALENDAR_VIEWS: { value: CalendarView; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "list", label: "List" },
];

export const CALENDAR_MODES: {
  value: CalendarMode;
  label: string;
  description: string;
}[] = [
  {
    value: "events",
    label: "Events",
    description: "School event dates across the year",
  },
  {
    value: "communications",
    label: "Communications",
    description: "Timeline steps due for each event",
  },
  {
    value: "publishing",
    label: "Publishing",
    description: "Drafts ready to review and publish",
  },
  {
    value: "approvals",
    label: "Approvals",
    description: "Board review queue (preview)",
  },
];

export const WORKLOAD_LABELS = {
  calm: "Calm",
  light: "Light",
  busy: "Busy",
  overloaded: "Overloaded",
} as const;

export const WORKLOAD_STYLES = {
  calm: "bg-cos-success-bg text-cos-success-text ring-cos-border",
  light: "bg-cos-accent-soft text-cos-text ring-cos-border",
  busy: "bg-cos-warning text-cos-warning-text ring-cos-border",
  overloaded: "bg-cos-error-bg text-cos-error-text ring-cos-border",
} as const;

export const PLACEHOLDER_APPROVALS = [
  {
    id: "placeholder-approval-1",
    eventTitle: "Fall Book Fair",
    channel: "Facebook",
    dueDateOffset: 7,
  },
  {
    id: "placeholder-approval-2",
    eventTitle: "Teacher Appreciation Week",
    channel: "Newsletter",
    dueDateOffset: 14,
  },
] as const;
