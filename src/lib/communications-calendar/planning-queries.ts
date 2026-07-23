import {
  buildUnifiedCalendarItemsFromRaw,
} from "@/lib/communications-calendar/build-unified-calendar-items";
import { fetchUnifiedCalendarRawData } from "@/lib/communications-calendar/unified-calendar-raw";
import { resolveTodayPlanningWindow } from "@/lib/communications-calendar/planning-date-window";
import { fetchPlanningRawDataForEvents } from "@/lib/communications-calendar/planning-raw";
import { resolveCalendarSchoolYearLabel } from "@/lib/calendar-import/calendar-window";
import {
  getCalendarWindowEventCount,
  getImportedEventsForCalendarList,
} from "@/lib/calendar-import/queries";
import { getEventsInDateRange } from "@/lib/events/queries";
import { computePostingHeatmap } from "@/lib/posting-analytics/compute-heatmap";
import { fetchPublishedPostTimestamps } from "@/lib/posting-analytics/fetch-publish-history";
import {
  getStoredMetaConnectionForOrganization,
  isMetaConnectionConfigured,
} from "@/lib/meta-publishing/connection";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { getActiveSchoolYear } from "@/lib/school-years/queries";
import type { PlanningCalendarData } from "@/types/communications-calendar";
import type { PlanningCalendarItem } from "@/types/communications-calendar";

export async function getPlanningCalendarData(): Promise<PlanningCalendarData> {
  const organization = await getLatestOrganization();
  const schoolYear = organization?.schoolYear ?? null;
  const orgMeta = await getStoredMetaConnectionForOrganization(
    organization?.id ?? null,
  );
  const metaConnected = isMetaConnectionConfigured(orgMeta);

  const [activeSchoolYear, raw, importedList, publishedAtTimestamps] =
    await Promise.all([
      organization
        ? getActiveSchoolYear(organization.id)
        : Promise.resolve(null),
      fetchUnifiedCalendarRawData(schoolYear, organization?.id ?? null),
      getImportedEventsForCalendarList(),
      metaConnected ? fetchPublishedPostTimestamps() : Promise.resolve([] as string[]),
    ]);

  let importCleanup: PlanningCalendarData["importCleanup"] = null;

  const schoolYearLabel = resolveCalendarSchoolYearLabel({
    activeSchoolYearLabel: activeSchoolYear?.label,
    organizationSchoolYear: organization?.schoolYear,
  });
  const eventCount = await getCalendarWindowEventCount(
    schoolYearLabel,
    organization?.id ?? null,
  );
  if (eventCount > 0) {
    importCleanup = {
      schoolYearId: activeSchoolYear?.id ?? null,
      schoolYearLabel: schoolYearLabel ?? "your calendar",
      eventCount,
    };
  }

  // Best-times heat sheet is Meta-backed — hide when this org has no Meta connection.
  const postingHeatmap = metaConnected
    ? computePostingHeatmap({
        timezone: organization?.timezone ?? "America/Chicago",
        preferredPostingHours: organization?.preferredPostingHours ?? null,
        publishedAtTimestamps,
      })
    : null;

  return {
    items: buildUnifiedCalendarItemsFromRaw(raw),
    importCleanup,
    importedEvents: importedList.events,
    importListFilename: importedList.filename,
    activeSchoolYearId: activeSchoolYear?.id ?? null,
    postingHeatmap,
  };
}

/**
 * Approvals hub only needs Meta milestone planning items — not import cleanup,
 * heatmap, or the imported-events list (those belong on Calendar).
 */
export async function getApprovalsPlanningItems(): Promise<
  PlanningCalendarItem[]
> {
  const organization = await getLatestOrganization();
  const raw = await fetchUnifiedCalendarRawData(
    organization?.schoolYear ?? null,
    organization?.id ?? null,
  );
  return buildUnifiedCalendarItemsFromRaw(raw).filter(
    (item) => item.communicationType === "meta_milestone",
  );
}

/** Lightweight Today path: scoped to recent overdue + upcoming work in the school year. */
export async function getTodayPlanningItems(): Promise<PlanningCalendarItem[]> {
  const { buildPlanningItemsFromRaw, TODAY_PLANNING_ITEM_OPTIONS } = await import(
    "@/lib/communications-calendar/build-planning-items"
  );

  const organization = await getLatestOrganization();
  const window = resolveTodayPlanningWindow(organization?.schoolYear ?? null);
  const events = await getEventsInDateRange(
    window.startDate,
    window.endDate,
    organization?.id ?? null,
  );
  const raw = await fetchPlanningRawDataForEvents(events.map((event) => event.id));
  return buildPlanningItemsFromRaw(raw, TODAY_PLANNING_ITEM_OPTIONS);
}
