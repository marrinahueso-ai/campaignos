import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { OrgBillingSnapshot } from "@/lib/billing/org-billing";
import {
  pairCapacityUsage,
  type CapacityUsageEntry,
} from "@/lib/billing/capacity-usage-pure";

export type { CapacityUsageEntry } from "@/lib/billing/capacity-usage-pure";

/** Active (status = 'active') organization_users — mirrors inviteTeamMemberAction's seat count. */
export async function countActiveTeamMembers(orgId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("organization_users")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("status", "active");
  return count ?? 0;
}

/** Active committee chairs — mirrors inviteTeamMemberAction's chair count. */
export async function countCommitteeChairs(orgId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("organization_users")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("campaign_role", "committee_chair")
    .eq("status", "active");
  return count ?? 0;
}

/**
 * All non-archived events for the org. Mirrors createEvent's count exactly:
 * relies on events RLS (scoped via school_years.organization_id to the
 * signed-in member) rather than an explicit organization_id filter, and is
 * NOT actually scoped to a school year despite the "eventsPerSchoolYear"
 * capacity key name — preserved as-is, not "fixed" here.
 */
export async function countEventsForCapacity(orgId: string): Promise<number> {
  void orgId; // Not used to filter — see doc comment above.
  const supabase = await createClient();
  const { count } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .neq("status", "archived");
  return count ?? 0;
}

/**
 * Distinct event_id:relative_day milestones with an active-ish Meta slot
 * status, scheduled on/after the current UTC month start. Mirrors
 * assertMetaPostCapacityForEvent's count exactly.
 */
export async function countMetaPostsThisMonth(orgId: string): Promise<number> {
  const supabase = await createClient();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const { data: schoolYears } = await supabase
    .from("school_years")
    .select("id")
    .eq("organization_id", orgId);
  const schoolYearIds = (schoolYears ?? []).map((row) => row.id);
  if (schoolYearIds.length === 0) {
    return 0;
  }

  const { data: orgEvents } = await supabase
    .from("events")
    .select("id")
    .in("school_year_id", schoolYearIds);
  const orgEventIds = (orgEvents ?? []).map((row) => row.id);
  if (orgEventIds.length === 0) {
    return 0;
  }

  const { data: slots } = await supabase
    .from("meta_publication_slots")
    .select("event_id, relative_day")
    .in("event_id", orgEventIds)
    .in("status", ["scheduled", "approved", "posting", "published"])
    .gte("scheduled_for", monthStart.toISOString());

  const distinctMilestones = new Set(
    (slots ?? []).map((row) => `${row.event_id}:${row.relative_day}`),
  );
  return distinctMilestones.size;
}

/**
 * organization_meta_connections row count. Mirrors
 * assertSocialAccountCapacityForNewConnection's count exactly (a count > 0
 * is treated as an existing connection/reconnect elsewhere, not handled
 * here — this counter just reports the raw row count for display).
 */
export async function countSocialAccounts(orgId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("organization_meta_connections")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId);
  return count ?? 0;
}

export async function getOrgCapacityUsage(
  orgId: string,
  snapshot: OrgBillingSnapshot,
): Promise<CapacityUsageEntry[]> {
  const [teamMembers, committeeChairs, eventsPerSchoolYear, metaPostsPerMonth, socialAccounts] =
    await Promise.all([
      countActiveTeamMembers(orgId),
      countCommitteeChairs(orgId),
      countEventsForCapacity(orgId),
      countMetaPostsThisMonth(orgId),
      countSocialAccounts(orgId),
    ]);

  return pairCapacityUsage(snapshot, {
    teamMembers,
    committeeChairs,
    eventsPerSchoolYear,
    metaPostsPerMonth,
    socialAccounts,
  });
}
