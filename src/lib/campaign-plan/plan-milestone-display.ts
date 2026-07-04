import type { MetaPublicationSlotStatus } from "@/lib/meta-publishing/types";

const COMMITTED_SLOT_STATUSES = new Set<MetaPublicationSlotStatus>([
  "scheduled",
  "approved",
  "posting",
  "published",
]);

/** Default 10:00 UTC on the plan due date — matches meta slot seeding. */
export function planDueDateToScheduledTime(dueDate: string | null | undefined): string | null {
  if (!dueDate) {
    return null;
  }

  return `${String(dueDate).slice(0, 10)}T10:00:00.000Z`;
}

/** Plan due date is source of truth until a slot is committed to a schedule. */
export function resolveBundleScheduledFor(input: {
  dueDate: string | null | undefined;
  slotScheduledFor?: string | null;
  slotStatus?: MetaPublicationSlotStatus;
}): string | null {
  const planScheduledFor = planDueDateToScheduledTime(input.dueDate);

  if (
    input.slotScheduledFor &&
    input.slotStatus &&
    COMMITTED_SLOT_STATUSES.has(input.slotStatus)
  ) {
    return input.slotScheduledFor;
  }

  return planScheduledFor;
}
