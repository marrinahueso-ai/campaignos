import {
  buildUnifiedCalendarItemsFromRaw,
} from "@/lib/communications-calendar/build-unified-calendar-items";
import { fetchUnifiedCalendarRawData } from "@/lib/communications-calendar/unified-calendar-raw";
import { resolveTodayPlanningWindow } from "@/lib/communications-calendar/planning-date-window";
import { fetchPlanningRawDataForEvents } from "@/lib/communications-calendar/planning-raw";
import { getLatestCalendarImport, getImportedEventsForCalendarList } from "@/lib/calendar-import/queries";
import { getEventsInDateRange } from "@/lib/events/queries";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";
import type { PlanningCalendarData } from "@/types/communications-calendar";
import type { PlanningCalendarItem } from "@/types/communications-calendar";

export async function getPlanningCalendarData(): Promise<PlanningCalendarData> {
  const organization = await getLatestOrganization();
  const schoolYear = organization?.schoolYear ?? null;

  const [raw, latestImport, importedList] = await Promise.all([
    fetchUnifiedCalendarRawData(schoolYear),
    getLatestCalendarImport(),
    getImportedEventsForCalendarList(),
  ]);

  let importCleanup: PlanningCalendarData["importCleanup"] = null;

  if (latestImport?.importedAt) {
    const supabase = await createClient();
    const { count } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("calendar_import_id", latestImport.id);

    if ((count ?? 0) > 0) {
      importCleanup = {
        importId: latestImport.id,
        filename: latestImport.filename,
        importedCount: count ?? 0,
      };
    }
  }

  return {
    items: buildUnifiedCalendarItemsFromRaw(raw),
    importCleanup,
    importedEvents: importedList.events,
    importListFilename: importedList.filename,
  };
}

/** Lightweight Today path: scoped to recent overdue + upcoming work in the school year. */
export async function getTodayPlanningItems(): Promise<PlanningCalendarItem[]> {
  const { buildPlanningItemsFromRaw, TODAY_PLANNING_ITEM_OPTIONS } = await import(
    "@/lib/communications-calendar/build-planning-items"
  );

  const organization = await getLatestOrganization();
  const window = resolveTodayPlanningWindow(organization?.schoolYear ?? null);
  const events = await getEventsInDateRange(window.startDate, window.endDate);
  const raw = await fetchPlanningRawDataForEvents(events.map((event) => event.id));
  return buildPlanningItemsFromRaw(raw, TODAY_PLANNING_ITEM_OPTIONS);
}
