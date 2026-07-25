/**
 * Pure capacity-usage pairing helpers (safe for unit tests — no server-only,
 * no Supabase client). Mirrors the org-billing / org-billing-pure split.
 */

import {
  CAPACITY_DISPLAY_LABELS,
  type PlanCapacityKey,
} from "@/lib/billing/entitlements";
import { orgCapacityLimit, type OrgBillingSnapshot } from "@/lib/billing/org-billing-pure";

export type CapacityUsageEntry = {
  key: PlanCapacityKey;
  label: string;
  used: number;
  limit: number | null;
};

/** Display order for the Usage tab's capacity list. */
export const CAPACITY_DISPLAY_ORDER: PlanCapacityKey[] = [
  "teamMembers",
  "committeeChairs",
  "eventsPerSchoolYear",
  "metaPostsPerMonth",
  "socialAccounts",
];

/** Pure pairing of counted usage with plan limits — split out from getOrgCapacityUsage for unit testing without a DB. */
export function pairCapacityUsage(
  snapshot: OrgBillingSnapshot,
  counts: Record<PlanCapacityKey, number>,
): CapacityUsageEntry[] {
  return CAPACITY_DISPLAY_ORDER.map((key) => ({
    key,
    label: CAPACITY_DISPLAY_LABELS[key],
    used: counts[key],
    limit: orgCapacityLimit(snapshot, key),
  }));
}
