import type { CalendarReviewEvent } from "@/types/calendar-review";

export type SyncReviewDecision =
  | "use_calendar_update"
  | "keep_hey_ralli"
  | "keep_both";

export type SyncReviewSections = {
  needsAttention: CalendarReviewEvent[];
  changes: CalendarReviewEvent[];
  newlyAdded: CalendarReviewEvent[];
  alreadyOnCalendar: CalendarReviewEvent[];
  skippedUpdates: CalendarReviewEvent[];
};

/**
 * Partition review rows for the Sync Review UX.
 *
 * - Needs attention: conflicts + ambiguous AI rows (human decision required)
 * - Changes: updates that will patch existing events on Finish (visible old → new)
 * - Newly added: ready rows that will be created
 * - Already on calendar: exact duplicates (auto-skipped on Finish)
 * - Skipped updates: update rows the user chose to keep as Hey Ralli
 */
export function partitionSyncReviewSections(
  events: CalendarReviewEvent[],
): SyncReviewSections {
  const needsAttention: CalendarReviewEvent[] = [];
  const changes: CalendarReviewEvent[] = [];
  const newlyAdded: CalendarReviewEvent[] = [];
  const alreadyOnCalendar: CalendarReviewEvent[] = [];
  const skippedUpdates: CalendarReviewEvent[] = [];

  for (const event of events) {
    if (event.status === "conflict" || event.status === "needs_review") {
      needsAttention.push(event);
      continue;
    }
    if (event.status === "update") {
      if (event.applyUpdate === false) {
        skippedUpdates.push(event);
      } else {
        changes.push(event);
      }
      continue;
    }
    if (event.status === "duplicate") {
      alreadyOnCalendar.push(event);
      continue;
    }
    if (event.status === "ready") {
      newlyAdded.push(event);
    }
  }

  return {
    needsAttention,
    changes,
    newlyAdded,
    alreadyOnCalendar,
    skippedUpdates,
  };
}

export function buildSyncReviewSummaryCopy(sections: SyncReviewSections): string {
  const needs = sections.needsAttention.length;
  const changed = sections.changes.length;
  const added = sections.newlyAdded.length;
  const skipped =
    sections.alreadyOnCalendar.length + sections.skippedUpdates.length;

  if (needs === 0 && changed === 0 && added === 0) {
    if (skipped > 0) {
      return "Hey Ralli checked your calendar — everything is already up to date.";
    }
    return "Hey Ralli checked your calendar and didn’t find new dates to bring in.";
  }

  if (needs === 0) {
    const parts: string[] = [];
    if (added > 0) {
      parts.push(
        `${added} new event${added === 1 ? "" : "s"} ready to add`,
      );
    }
    if (changed > 0) {
      parts.push(
        `${changed} change${changed === 1 ? "" : "s"} ready to apply`,
      );
    }
    return `Hey Ralli checked your calendar and handled it — ${parts.join(" and ")}.`;
  }

  return `Hey Ralli checked your calendar and handled it. I only found ${needs} thing${needs === 1 ? "" : "s"} that need${needs === 1 ? "s" : ""} a quick look from you.`;
}

/**
 * Apply a Sync Review decision to one row.
 * Maps onto existing status / applyUpdate semantics used by import.
 */
export function applySyncReviewDecision(
  event: CalendarReviewEvent,
  decision: SyncReviewDecision,
): CalendarReviewEvent {
  if (decision === "keep_both") {
    return {
      ...event,
      status: "ready",
      existingEventId: null,
      existingEventName: null,
      existingEventDate: null,
      applyUpdate: false,
      matchReason: "Keeping both — will create a new calendar event.",
    };
  }

  if (decision === "keep_hey_ralli") {
    if (event.status === "update") {
      return {
        ...event,
        applyUpdate: false,
        matchReason: "Kept the Hey Ralli event — calendar update skipped.",
      };
    }
    if (event.status === "needs_review") {
      return {
        ...event,
        status: "duplicate",
        applyUpdate: false,
        matchReason: "Skipped — not added from this import.",
      };
    }
    return {
      ...event,
      status: "duplicate",
      applyUpdate: false,
      matchReason:
        event.matchReason ?? "Kept the Hey Ralli event — import row skipped.",
    };
  }

  // use_calendar_update
  if (event.status === "update") {
    return {
      ...event,
      applyUpdate: true,
      matchReason: event.matchReason ?? "Will apply the connected calendar update.",
    };
  }

  if (event.status === "duplicate" && event.existingEventId) {
    return {
      ...event,
      status: "duplicate",
      applyUpdate: false,
      matchReason: "Confirmed — already matches the Hey Ralli event.",
    };
  }

  if (event.status === "conflict" || event.status === "needs_review") {
    return {
      ...event,
      status: "ready",
      applyUpdate: false,
      matchReason: "Will add this event from your connected calendar.",
    };
  }

  return {
    ...event,
    status: "ready",
    applyUpdate: false,
  };
}

export function getSyncReviewChangeDiffs(event: CalendarReviewEvent): Array<{
  label: string;
  from: string;
  to: string;
}> {
  const diffs: Array<{ label: string; from: string; to: string }> = [];
  const existingName = event.existingEventName?.trim();
  const existingDate = event.existingEventDate?.trim();

  if (existingName && existingName !== event.name) {
    diffs.push({ label: "Title", from: existingName, to: event.name });
  }

  if (existingDate && existingDate !== event.date) {
    diffs.push({ label: "Date", from: existingDate, to: event.date });
  }

  if (diffs.length === 0 && event.matchReason) {
    diffs.push({
      label: "Update",
      from: "Hey Ralli",
      to: event.matchReason,
    });
  }

  return diffs;
}

/** Format a short date for change chips (e.g. Sept 18). */
export function formatSyncReviewShortDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  const parsed = new Date(year, month - 1, day);
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
