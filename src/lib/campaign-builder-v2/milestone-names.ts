/**
 * Canonical milestone title fixes shared by session hydrate, playbook reconcile,
 * and the approvals bridge.
 */

const STALE_MILESTONE_NAME_FIXES: Record<string, string> = {
  "Two-Week Reminder": "Two-Week Push",
  "Two Week Reminder": "Two-Week Push",
  "two-week reminder": "Two-Week Push",
};

export function normalizeMilestoneName(name: string): string {
  const trimmed = name.trim();
  if (STALE_MILESTONE_NAME_FIXES[trimmed]) {
    return STALE_MILESTONE_NAME_FIXES[trimmed];
  }

  const lower = trimmed.toLowerCase();
  if (lower.includes("two") && lower.includes("week") && lower.includes("reminder")) {
    return "Two-Week Push";
  }

  return trimmed;
}

export function milestoneNameMatchKey(name: string): string {
  return normalizeMilestoneName(name).toLowerCase();
}
