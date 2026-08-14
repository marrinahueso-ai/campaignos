import type { CalendarReviewEvent } from "@/types/calendar-review";
import {
  formatSyncReviewLocation,
  formatSyncReviewShortDate,
  formatSyncReviewTime,
} from "@/lib/calendar-import/sync-review-format";

export type CalendarReviewMode = "first_import" | "sync";

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

export type FirstImportSections = {
  needsAttention: CalendarReviewEvent[];
  readyToAdd: CalendarReviewEvent[];
  alreadyOnCalendar: CalendarReviewEvent[];
};

/**
 * First import = no prior completed calendar import for the org, and this batch
 * has no Update rows (those only appear on re-sync against existing imports).
 * Otherwise use Sync Review.
 */
export function resolveCalendarReviewMode(
  events: CalendarReviewEvent[],
  options: { hasPriorImportedCalendar: boolean },
): CalendarReviewMode {
  if (options.hasPriorImportedCalendar) {
    return "sync";
  }
  if (events.some((event) => event.status === "update")) {
    return "sync";
  }
  return "first_import";
}

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

/**
 * First Import partition: ready list + attention for conflicts / ambiguous /
 * possible duplicates against anything already in Hey Ralli.
 */
export function partitionFirstImportSections(
  events: CalendarReviewEvent[],
): FirstImportSections {
  const needsAttention: CalendarReviewEvent[] = [];
  const readyToAdd: CalendarReviewEvent[] = [];
  const alreadyOnCalendar: CalendarReviewEvent[] = [];

  for (const event of events) {
    if (
      event.status === "conflict" ||
      event.status === "needs_review" ||
      (event.status === "duplicate" && event.existingEventId)
    ) {
      needsAttention.push(event);
      continue;
    }
    if (event.status === "duplicate") {
      alreadyOnCalendar.push(event);
      continue;
    }
    if (event.status === "ready") {
      readyToAdd.push(event);
    }
  }

  return { needsAttention, readyToAdd, alreadyOnCalendar };
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

export function buildFirstImportSummaryCopy(
  sections: FirstImportSections,
  totalFound: number,
): string {
  if (totalFound === 0) {
    return "Hey Ralli couldn’t find events to bring in from this calendar.";
  }
  if (sections.needsAttention.length === 0) {
    return "Hey Ralli successfully found your calendar events. They’re ready to add to your schedule.";
  }
  return "Hey Ralli successfully found your calendar events. Take a quick look before I add them to your schedule.";
}

/** Events that Finish / Add will create (not skipped duplicates/conflicts). */
export function countEventsToAdd(events: CalendarReviewEvent[]): number {
  let count = 0;
  for (const event of events) {
    if (event.status === "ready" || event.status === "needs_review") {
      count += 1;
    }
  }
  return count;
}

/**
 * Apply a Sync Review decision to one row.
 * Maps onto existing status / applyUpdate semantics used by import.
 * Same decisions are reused for First Import (button labels differ in UI).
 */
export function applySyncReviewDecision(
  event: CalendarReviewEvent,
  decision: SyncReviewDecision,
): CalendarReviewEvent {
  if (decision === "keep_both") {
    const fromEventId =
      event.existingEventId ?? event.keepBothFromEventId ?? null;
    return {
      ...event,
      status: "ready",
      existingEventId: null,
      existingEventName: null,
      existingEventDate: null,
      existingEventTime: null,
      existingEventLocation: null,
      // Detach source id from the copy so Finish can insert without unique-index
      // collision; the original row keeps the mapping and gets a dismiss snapshot.
      importExternalId: null,
      applyUpdate: false,
      keepBothFromEventId: fromEventId,
      matchReason: "Keeping both — will create a new calendar event.",
    };
  }

  if (decision === "keep_hey_ralli") {
    if (event.status === "update") {
      return {
        ...event,
        applyUpdate: false,
        keepBothFromEventId: null,
        matchReason: "Kept the Hey Ralli event — calendar update skipped.",
      };
    }
    if (event.status === "needs_review") {
      return {
        ...event,
        status: "duplicate",
        applyUpdate: false,
        keepBothFromEventId: null,
        matchReason: "Skipped — not added from this import.",
      };
    }
    return {
      ...event,
      status: "duplicate",
      applyUpdate: false,
      keepBothFromEventId: null,
      matchReason:
        event.matchReason ?? "Kept the Hey Ralli event — import row skipped.",
    };
  }

  // use_calendar_update / Use Calendar Event
  if (event.status === "update") {
    return {
      ...event,
      applyUpdate: true,
      keepBothFromEventId: null,
      matchReason: event.matchReason ?? "Will apply the connected calendar update.",
    };
  }

  if (event.status === "duplicate" && event.existingEventId) {
    return {
      ...event,
      status: "duplicate",
      applyUpdate: false,
      keepBothFromEventId: null,
      matchReason: "Confirmed — already matches the Hey Ralli event.",
    };
  }

  if (event.status === "conflict" || event.status === "needs_review") {
    return {
      ...event,
      status: "ready",
      applyUpdate: false,
      keepBothFromEventId: null,
      matchReason: "Will add this event from your connected calendar.",
    };
  }

  return {
    ...event,
    status: "ready",
    applyUpdate: false,
    keepBothFromEventId: null,
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
  const existingTime = event.existingEventTime?.trim() || "";
  const existingLocation = event.existingEventLocation?.trim() || "";
  const incomingTime = event.time?.trim() || "";
  const incomingLocation = event.location?.trim() || "";

  if (existingName && existingName !== event.name) {
    diffs.push({ label: "Title", from: existingName, to: event.name });
  }

  if (existingDate && existingDate !== event.date) {
    diffs.push({
      label: "Date",
      from: formatSyncReviewShortDate(existingDate),
      to: formatSyncReviewShortDate(event.date),
    });
  }

  if (existingTime !== incomingTime) {
    diffs.push({
      label: "Time",
      from: formatSyncReviewTime(existingTime),
      to: formatSyncReviewTime(incomingTime),
    });
  }

  if (existingLocation !== incomingLocation) {
    diffs.push({
      label: "Location",
      from: formatSyncReviewLocation(existingLocation),
      to: formatSyncReviewLocation(incomingLocation),
    });
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

export { formatSyncReviewShortDate };
