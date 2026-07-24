export type TodayActionKind = "step" | "event" | "caught_up";

export interface TodayWhatsNext {
  kind: TodayActionKind;
  title: string;
  subtitle: string | null;
  href: string | null;
  ctaLabel: string | null;
  eventId: string | null;
}

export interface TodayActionItem {
  id: string;
  eventId: string;
  eventTitle: string;
  title: string;
  dueDate: string;
  isOverdue: boolean;
  href: string;
  ctaLabel: string;
}

export interface TodayWaitingOnOthersItem {
  id: string;
  eventId: string;
  eventTitle: string;
  title: string;
  dueDate: string;
}

export interface TodayWeekEntry {
  id: string;
  date: string;
  title: string;
  eventTitle: string | null;
  kind: "event" | "communication" | "publishing";
  href: string | null;
}

export interface TodayEventProgress {
  eventId: string;
  title: string;
  date: string;
  progressPercent: number | null;
  progressLabel: string | null;
  statusLine: string;
  href: string;
  communicationStrategy: string;
}

export interface TodayAttentionCounts {
  reviewCount: number;
  volunteerCount: number;
  tasksThisWeekCount: number;
}

export interface TodayPageData {
  firstName: string | null;
  attentionCount: number;
  whatsNext: TodayWhatsNext;
  waitingOnMe: TodayActionItem[];
  waitingOnOthers: TodayWaitingOnOthersItem[];
  thisWeek: TodayWeekEntry[];
  /** Calendar-month school events only (no posts / schedule steps) for the mini calendar. */
  monthEvents: TodayWeekEntry[];
  upcomingEvents: TodayEventProgress[];
  teammateNote: string;
  goodNews: TodayGoodNews;
}

export type GoodNewsKind = "published" | "approved" | "completed" | "milestone";

export interface GoodNewsItem {
  id: string;
  kind: GoodNewsKind;
  message: string;
  timestampLabel: string;
  occurredOn: string;
  href?: string | null;
}

export interface TodayGoodNews {
  items: GoodNewsItem[];
  /** Shown when there are no recent activity items */
  fallbackMessage: string;
}
