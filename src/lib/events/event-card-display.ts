const CALENDAR_IMPORT_DESCRIPTION_PATTERN =
  /^Imported from school calendar(?: \([^)]+\))?\.?$/;

/** Hide auto-generated calendar import copy on campaign list cards. */
export function getEventCardDescription(
  description: string | null | undefined,
): string | null {
  if (!description) {
    return null;
  }

  const trimmed = description.trim();
  if (!trimmed || CALENDAR_IMPORT_DESCRIPTION_PATTERN.test(trimmed)) {
    return null;
  }

  return description;
}

const META_SCHEDULED_SLOT_STATUSES = new Set(["scheduled", "approved"]);

/** True when at least one Meta publication slot is queued for posting. */
export function hasMetaPublicationScheduled(
  slotStatuses: readonly string[],
): boolean {
  return slotStatuses.some((status) => META_SCHEDULED_SLOT_STATUSES.has(status));
}
