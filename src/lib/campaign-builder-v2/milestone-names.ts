/**
 * Canonical milestone title fixes shared by session hydrate, playbook reconcile,
 * and the approvals bridge.
 */

const STALE_MILESTONE_NAME_FIXES: Record<string, string> = {
  "Two-Week Reminder": "Two-Week Push",
  "Two Week Reminder": "Two-Week Push",
  "two-week reminder": "Two-Week Push",
  "Day Before Reminder": "Day Before",
  "Day-Before Reminder": "Day Before",
  "day before reminder": "Day Before",
};

/** Collapse hyphen/space/punctuation differences for milestone matching. */
export function milestoneTextMatchKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/[–—]/g, " ")
    .replace(/[-\s]+/g, " ")
    .trim();
}

export function normalizeMilestoneName(name: string): string {
  const trimmed = name.trim();
  if (STALE_MILESTONE_NAME_FIXES[trimmed]) {
    return STALE_MILESTONE_NAME_FIXES[trimmed];
  }

  const lower = trimmed.toLowerCase();
  if (lower.includes("two") && lower.includes("week") && lower.includes("reminder")) {
    return "Two-Week Push";
  }

  // "Day Before Reminder" / "Day-Before" → canonical playbook title
  if (
    lower.includes("day") &&
    lower.includes("before") &&
    !lower.includes("week")
  ) {
    return "Day Before";
  }

  return trimmed;
}

export function milestoneNameMatchKey(name: string): string {
  return milestoneTextMatchKey(normalizeMilestoneName(name));
}
