import "server-only";

import {
  buildPlanningHubSwitcherEvents,
  resolvePlanningHubSwitcherDateWindow,
} from "@/lib/events/campaign-page-utils";
import { getPlanningHubSwitcherEvents } from "@/lib/events/campaign-page-queries";
import { resolveScopedOrganizationId } from "@/lib/events/org-scope";
import { getActiveSchoolYear } from "@/lib/school-years/queries";
import type { CampaignOption } from "@/lib/campaign-builder-v2/types";
import type { Event } from "@/types";

function formatEventDate(date: string): string {
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

function buildCampaignOptionLabel(title: string, date: string): string {
  return `${title} — ${formatEventDate(date)}`;
}

/**
 * Campaign dropdown options — current school year (July–June window),
 * alphabetically by campaign name, with date in the display label.
 */
export async function getCampaignBuilderCampaignOptions(
  organizationId: string | null,
  currentEvent: Event,
): Promise<CampaignOption[]> {
  const events = await getPlanningHubSwitcherEvents(organizationId);
  const scopedOrgId = await resolveScopedOrganizationId(organizationId);
  const activeSchoolYear = scopedOrgId
    ? await getActiveSchoolYear(scopedOrgId)
    : null;
  const dateWindow = resolvePlanningHubSwitcherDateWindow(activeSchoolYear?.label);
  const switcherEvents = buildPlanningHubSwitcherEvents(events, currentEvent, {
    dateWindow,
  });

  return [...switcherEvents]
    .sort((left, right) =>
      left.title.localeCompare(right.title, undefined, { sensitivity: "base" }),
    )
    .map((event) => ({
      id: event.id,
      title: event.title,
      label: buildCampaignOptionLabel(event.title, event.date),
      date: event.date,
      description: event.description,
    }));
}
