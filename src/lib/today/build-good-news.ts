import { CHANNEL_LABELS } from "@/lib/playbooks/constants";
import { addDaysToDateOnly, formatLocalDate, parseLocalDate } from "@/lib/utils/dates";
import type { EventHistoryContext } from "@/lib/memory";
import type { Event } from "@/types";
import type { PlanningCalendarItem } from "@/types/communications-calendar";
import type { GoodNewsItem, TodayGoodNews } from "@/types/today";

const RECENT_DAYS = 14;
const MAX_ITEMS = 5;

const ENCOURAGEMENT_MESSAGES = [
  "Everything is on schedule.",
  "Nothing needs your attention right now.",
  "You're all caught up.",
] as const;

interface BuildGoodNewsInput {
  planningItems: PlanningCalendarItem[];
  today: string;
  hasOverdueSteps: boolean;
  events?: Event[];
  memoryHintsByEventId?: Map<string, EventHistoryContext>;
}

export function buildGoodNews(input: BuildGoodNewsInput): TodayGoodNews {
  const candidates: GoodNewsItem[] = [];

  for (const item of input.planningItems) {
    const candidate = toGoodNewsItem(item, input.today);
    if (candidate) candidates.push(candidate);
  }

  candidates.push(...buildMemoryGoodNews(input));

  if (!input.hasOverdueSteps && hasActiveCommunications(input.planningItems)) {
    candidates.push({
      id: "milestone-no-overdue",
      kind: "milestone",
      message: "No overdue communications",
      timestampLabel: formatGoodNewsTimestamp(input.today, input.today),
      occurredOn: input.today,
      href: "/calendar",
    });
  }

  const deduped = dedupeGoodNews(candidates)
    .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn))
    .slice(0, MAX_ITEMS);

  return {
    items: deduped,
    fallbackMessage: pickEncouragement(input.today),
  };
}

function buildMemoryGoodNews(input: BuildGoodNewsInput): GoodNewsItem[] {
  if (!input.events?.length || !input.memoryHintsByEventId) {
    return [];
  }

  const items: GoodNewsItem[] = [];
  const seenMessages = new Set<string>();

  for (const event of input.events) {
    const context = input.memoryHintsByEventId.get(event.id);
    if (!context || context.priorRunCount === 0) continue;

    const runMessage =
      context.totalRunCount >= 4
        ? `This event has been run ${context.totalRunCount} years.`
        : context.priorRunCount === 1
          ? "This event has been run before."
          : `This event has been run ${context.totalRunCount} times.`;

    if (!seenMessages.has(runMessage)) {
      seenMessages.add(runMessage);
      items.push({
        id: `memory-runs-${event.id}`,
        kind: "milestone",
        message: runMessage,
        timestampLabel: context.lastRunDate
          ? formatGoodNewsTimestamp(context.lastRunDate, input.today)
          : "Earlier",
        occurredOn: context.lastRunDate ?? input.today,
        href: `/events/${event.id}`,
      });
    }

    if (context.hasPriorArtwork) {
      const artMessage = "Last year's artwork is available.";
      if (!seenMessages.has(artMessage)) {
        seenMessages.add(artMessage);
        items.push({
          id: `memory-art-${event.id}`,
          kind: "milestone",
          message: artMessage,
          timestampLabel: context.lastRunDate
            ? formatGoodNewsTimestamp(context.lastRunDate, input.today)
            : "Earlier",
          occurredOn: context.lastRunDate ?? input.today,
          href: `/events/${event.id}`,
        });
      }
    }
  }

  return items.slice(0, 2);
}

function toGoodNewsItem(
  item: PlanningCalendarItem,
  today: string,
): GoodNewsItem | null {
  if (!isRecent(item.scheduledDate, today)) return null;

  const href = `/events/${item.eventId}`;

  if (isPublished(item)) {
    const message = publishedMessage(item);
    if (!message) return null;
    return {
      id: `good-${item.id}`,
      kind: "published",
      message,
      timestampLabel: formatGoodNewsTimestamp(item.scheduledDate, today),
      occurredOn: item.scheduledDate,
      href,
    };
  }

  if (isApproved(item)) {
    return {
      id: `good-${item.id}`,
      kind: "approved",
      message: approvedMessage(item),
      timestampLabel: formatGoodNewsTimestamp(item.scheduledDate, today),
      occurredOn: item.scheduledDate,
      href,
    };
  }

  if (item.sourceType === "timeline_task" && item.status === "completed") {
    const message = completedStepMessage(item);
    return {
      id: `good-${item.id}`,
      kind: "completed",
      message,
      timestampLabel: formatGoodNewsTimestamp(item.scheduledDate, today),
      occurredOn: item.scheduledDate,
      href,
    };
  }

  if (
    item.sourceType === "event" &&
    item.scheduledDate < today &&
    item.status === "published"
  ) {
    return {
      id: `good-${item.id}`,
      kind: "completed",
      message: `${item.title} completed`,
      timestampLabel: formatGoodNewsTimestamp(item.scheduledDate, today),
      occurredOn: item.scheduledDate,
      href,
    };
  }

  return null;
}

function isPublished(item: PlanningCalendarItem): boolean {
  return (
    item.publishStatus === "published" ||
    item.status === "published" ||
    item.draftStatus === "published"
  );
}

function isApproved(item: PlanningCalendarItem): boolean {
  return (
    item.approvalStatus === "approved" ||
    (item.sourceType === "approval" && item.status === "approved")
  );
}

function publishedMessage(item: PlanningCalendarItem): string | null {
  const title = item.title.toLowerCase();
  const channel = item.channel;

  if (channel === "facebook") {
    return title.includes("story") ? "Facebook Story published" : "Facebook post published";
  }
  if (channel === "instagram") {
    if (title.includes("story")) return "Instagram Story published";
    if (title.includes("reel")) return "Instagram Reel published";
    return "Instagram post published";
  }
  if (channel === "newsletter") return "Newsletter sent";
  if (channel === "website_announcement") return "Website updated";
  if (channel === "email") return "Email sent";
  if (channel === "volunteer_signup") return "Volunteer sign-up received";
  if (channel === "flyer" || title.includes("flyer")) return "Flyer published";

  if (item.sourceType === "scheduled_post") {
    const label = channel ? channelLabel(channel) : "Post";
    return `${label} published`;
  }

  if (item.sourceType === "draft" || item.sourceType === "timeline_task") {
    if (channel) return `${channelLabel(channel)} published`;
  }

  return null;
}

function approvedMessage(item: PlanningCalendarItem): string {
  const title = item.title.toLowerCase();
  if (item.channel === "flyer" || title.includes("flyer")) {
    return `Flyer approved for ${item.eventTitle}`;
  }
  if (item.sourceType === "artwork" && item.artworkStatus === "uploaded") {
    return `Flyer ready for ${item.eventTitle}`;
  }
  return `${item.eventTitle} approved`;
}

function completedStepMessage(item: PlanningCalendarItem): string {
  if (item.channel === "volunteer_signup") return "Volunteer sign-up received";
  if (item.channel) {
    return `${channelLabel(item.channel)} completed for ${item.eventTitle}`;
  }
  return `${item.title} completed`;
}

function channelLabel(channel: NonNullable<PlanningCalendarItem["channel"]>): string {
  const label = CHANNEL_LABELS[channel];
  if (label) return label;
  return channel.replace(/_/g, " ");
}

function isRecent(date: string, today: string): boolean {
  const cutoff = addDays(today, -RECENT_DAYS);
  return date >= cutoff && date <= today;
}

function addDays(date: string, days: number): string {
  return addDaysToDateOnly(date, days);
}

function hasActiveCommunications(items: PlanningCalendarItem[]): boolean {
  return items.some(
    (item) =>
      item.sourceType === "timeline_task" ||
      item.sourceType === "draft" ||
      item.sourceType === "scheduled_post",
  );
}

function dedupeGoodNews(items: GoodNewsItem[]): GoodNewsItem[] {
  const seen = new Set<string>();
  const result: GoodNewsItem[] = [];

  for (const item of items) {
    const key = item.message.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

export function formatGoodNewsTimestamp(date: string, today: string): string {
  const diff = daysBetween(date, today);

  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff > 1 && diff <= 7) return `${diff} days ago`;

  return formatLocalDate(date, {
    month: "short",
    day: "numeric",
  });
}

function daysBetween(date: string, today: string): number {
  const target = parseLocalDate(date);
  const current = parseLocalDate(today);
  return Math.round((current.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
}

function pickEncouragement(today: string): string {
  const seed = Number(today.replace(/-/g, "")) % ENCOURAGEMENT_MESSAGES.length;
  return ENCOURAGEMENT_MESSAGES[seed]!;
}
