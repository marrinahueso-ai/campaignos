import type { MetaPublishBundle } from "@/lib/meta-publishing/types";
import { getTodayDateString, parseLocalDate } from "@/lib/utils/dates";
import type { EventPlaybookTask } from "@/types/event-playbooks";
import type { Event } from "@/types";

export type TaskDueGroup = "overdue" | "today" | "upcoming";

export type SocialPostFilter = "upcoming" | "recent" | "drafts";

export interface GroupedOpenTasks {
  overdue: EventPlaybookTask[];
  today: EventPlaybookTask[];
  upcoming: EventPlaybookTask[];
}

export function groupOpenTasksByDue(tasks: EventPlaybookTask[]): GroupedOpenTasks {
  const today = getTodayDateString();
  const openTasks = tasks.filter((task) => task.status !== "done");

  const overdue: EventPlaybookTask[] = [];
  const todayTasks: EventPlaybookTask[] = [];
  const upcoming: EventPlaybookTask[] = [];

  for (const task of openTasks) {
    if (!task.dueDate) {
      upcoming.push(task);
      continue;
    }
    if (task.dueDate < today) {
      overdue.push(task);
    } else if (task.dueDate === today) {
      todayTasks.push(task);
    } else {
      upcoming.push(task);
    }
  }

  const byDue = (left: EventPlaybookTask, right: EventPlaybookTask) => {
    const leftDate = left.dueDate ?? "9999-12-31";
    const rightDate = right.dueDate ?? "9999-12-31";
    return leftDate.localeCompare(rightDate);
  };

  return {
    overdue: overdue.sort(byDue),
    today: todayTasks.sort(byDue),
    upcoming: upcoming.sort(byDue),
  };
}

export function formatTaskDueLabel(dueDate: string | null, group: TaskDueGroup): string {
  if (!dueDate) {
    return "No due date";
  }

  const formatted = parseLocalDate(dueDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  if (group === "overdue" || group === "today") {
    return `Due ${formatted}`;
  }

  return `Due ${formatted}`;
}

export function buildGoogleCalendarUrl(event: Event): string {
  const dateCompact = event.date.replace(/-/g, "");
  let dates = `${dateCompact}/${dateCompact}`;

  if (event.time) {
    const [hours, minutes] = event.time.split(":");
    const start = new Date(parseLocalDate(event.date));
    start.setHours(Number(hours), Number(minutes), 0, 0);
    const end = new Date(start);
    end.setHours(end.getHours() + 1);
    const fmt = (value: Date) =>
      value
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "");
    dates = `${fmt(start)}/${fmt(end)}`;
  }

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates,
    details: event.description ?? "",
    location: event.location ?? "",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

const UPCOMING_STATUSES = new Set<MetaPublishBundle["status"]>([
  "scheduled",
  "approved",
  "ready",
]);
const DRAFT_STATUSES = new Set<MetaPublishBundle["status"]>([
  "needs_artwork",
  "needs_caption",
  "ready",
]);
const RECENT_STATUSES = new Set<MetaPublishBundle["status"]>(["published"]);

export function filterSocialBundles(
  bundles: MetaPublishBundle[],
  filter: SocialPostFilter,
): MetaPublishBundle[] {
  const metaBundles = bundles.filter(
    (bundle) => bundle.isMetaPost && bundle.status !== "skipped",
  );
  const now = Date.now();

  const sorted = [...metaBundles].sort((left, right) => {
    const leftTime = left.scheduledFor
      ? new Date(left.scheduledFor).getTime()
      : left.dueDate
        ? parseLocalDate(left.dueDate).getTime()
        : 0;
    const rightTime = right.scheduledFor
      ? new Date(right.scheduledFor).getTime()
      : right.dueDate
        ? parseLocalDate(right.dueDate).getTime()
        : 0;
    return leftTime - rightTime;
  });

  if (filter === "upcoming") {
    return sorted.filter((bundle) => {
      if (!UPCOMING_STATUSES.has(bundle.status)) {
        return false;
      }
      if (!bundle.scheduledFor) {
        return true;
      }
      return new Date(bundle.scheduledFor).getTime() >= now;
    });
  }

  if (filter === "recent") {
    return sorted
      .filter((bundle) => RECENT_STATUSES.has(bundle.status))
      .reverse();
  }

  return sorted.filter((bundle) => DRAFT_STATUSES.has(bundle.status));
}

export function formatSocialPostSchedule(bundle: MetaPublishBundle): string {
  const iso = bundle.scheduledFor;
  if (!iso) {
    return bundle.dueDate
      ? parseLocalDate(bundle.dueDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : "Not scheduled";
  }

  const date = new Date(iso);
  const dateLabel = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const timeLabel = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${dateLabel} · ${timeLabel}`;
}

export function socialPostPlatformLabel(bundle: MetaPublishBundle): string {
  const platforms = new Set(bundle.targets.map((target) => target.platform));
  if (platforms.has("facebook") && platforms.has("instagram")) {
    return "Facebook & Instagram";
  }
  if (platforms.has("instagram")) {
    return "Instagram";
  }
  if (platforms.has("facebook")) {
    return "Facebook";
  }
  return "Social";
}

export function socialPostThumbnail(bundle: MetaPublishBundle): string | null {
  return bundle.feedArtworkUrl ?? bundle.storyArtworkUrl ?? null;
}

export function isScheduledSocialPost(bundle: MetaPublishBundle): boolean {
  return bundle.status === "scheduled" || bundle.status === "approved";
}

export function formatSocialPostDateColumn(bundle: MetaPublishBundle): {
  month: string;
  day: string;
  weekday: string;
} {
  const iso = bundle.scheduledFor;
  const date = iso ? new Date(iso) : bundle.dueDate ? parseLocalDate(bundle.dueDate) : new Date();

  return {
    month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: date.toLocaleDateString("en-US", { day: "2-digit" }),
    weekday: date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
  };
}

export function formatSocialPostTime(bundle: MetaPublishBundle): string {
  if (!bundle.scheduledFor) {
    return bundle.dueDate ? "All day" : "Not scheduled";
  }

  return new Date(bundle.scheduledFor).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function parseVolunteerStats(event: Event): {
  total: number | null;
  checkedIn: number | null;
  stillNeeded: number | null;
} {
  const needsText = event.volunteerNeeds?.trim() ?? "";
  const stillMatch = needsText.match(/(?:still\s+need(?:ed)?|need)\s*(\d+)/i);
  const stillNeeded = stillMatch ? Number(stillMatch[1]) : null;

  const totalMatch =
    needsText.match(/(\d+)\s*volunteers?/i) ??
    needsText.match(/of\s*(\d+)/i) ??
    needsText.match(/^(\d+)\b/);
  const total = totalMatch ? Number(totalMatch[1]) : null;

  const checkedIn =
    total !== null && stillNeeded !== null && total >= stillNeeded
      ? total - stillNeeded
      : null;

  return { total, checkedIn, stillNeeded };
}
