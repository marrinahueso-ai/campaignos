"use server";

import { revalidatePath } from "next/cache";
import { getCurrentOrganization } from "@/lib/auth/organization-context";
import { getEventInsightsPageData } from "@/lib/insights/event-queries";
import { getInsightsPageData } from "@/lib/insights/queries";
import type {
  EventInsightsPageData,
  InsightsPageData,
} from "@/lib/insights/types";
import { syncOrganizationInsights } from "@/lib/meta/insights-sync";

export async function syncInsightsAction(input?: {
  since?: string;
  until?: string;
}): Promise<{
  ok: boolean;
  postsSynced: number;
  daysSynced: number;
  error: string | null;
  warnings: string[];
}> {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return {
      ok: false,
      postsSynced: 0,
      daysSynced: 0,
      error: "Organization not found.",
      warnings: [],
    };
  }

  const { assertOrgFeature } = await import("@/lib/billing/gates");
  const featureGate = await assertOrgFeature(organization.id, "social_analytics");
  if (!featureGate.ok) {
    return {
      ok: false,
      postsSynced: 0,
      daysSynced: 0,
      error: `${featureGate.message} ${featureGate.upgradeHint}`,
      warnings: [],
    };
  }

  const result = await syncOrganizationInsights({
    organizationId: organization.id,
    since: input?.since,
    until: input?.until,
  });

  revalidatePath("/insights");
  revalidatePath("/events", "layout");

  return result;
}

/** Targeted org Insights reload — avoids remounting the Ease shell via router.replace. */
export async function loadInsightsPageDataAction(input?: {
  from?: string | null;
  to?: string | null;
  range?: string | null;
}): Promise<InsightsPageData | null> {
  return getInsightsPageData({
    from: input?.from,
    to: input?.to,
    range: input?.range,
  });
}

export async function loadEventInsightsAction(
  eventId: string,
): Promise<EventInsightsPageData | null> {
  const trimmed = eventId.trim();
  if (!trimmed) return null;
  return getEventInsightsPageData(trimmed);
}
