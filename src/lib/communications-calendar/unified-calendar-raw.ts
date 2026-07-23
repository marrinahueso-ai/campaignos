import "server-only";

import { cache } from "react";
import { resolveCalendarPlanningWindow } from "@/lib/communications-calendar/planning-date-window";
import {
  PLANNING_EVENT_SELECT,
  UNIFIED_META_SLOT_SELECT,
} from "@/lib/communications-calendar/planning-selects";
import { createClient } from "@/lib/supabase/server";
import { mapMetaPublicationSlotRow } from "@/lib/meta-publishing/mappers";
import { COMMITTED_META_SLOT_STATUSES } from "@/lib/meta-publishing/slot-status";
import type { MetaPublicationSlot, MetaPublicationSlotRow } from "@/lib/meta-publishing/types";
import type { EventRow as CoreEventRow } from "@/types";

export interface UnifiedCalendarRawData {
  eventRows: CoreEventRow[];
  metaSlots: MetaPublicationSlot[];
}

/** Lightweight fetch for the parent calendar — events + Meta milestones in the school-year window. */
export const fetchUnifiedCalendarRawData = cache(
  async (
    schoolYear?: string | null,
    organizationId?: string | null,
  ): Promise<UnifiedCalendarRawData> => {
    const window = resolveCalendarPlanningWindow(schoolYear);
    const { getOrganizationSchoolYearIds, resolveScopedOrganizationId } =
      await import("@/lib/events/org-scope");
    const scopedOrgId = await resolveScopedOrganizationId(organizationId);
    const schoolYearIds = scopedOrgId
      ? await getOrganizationSchoolYearIds(scopedOrgId)
      : [];

    if (!schoolYearIds.length) {
      return { eventRows: [], metaSlots: [] };
    }

    const supabase = await createClient();

    const { data: eventRows } = await supabase
      .from("events")
      .select(PLANNING_EVENT_SELECT)
      .gte("date", window.startDate)
      .lte("date", window.endDate)
      .neq("status", "archived")
      .in("school_year_id", schoolYearIds)
      .order("date", { ascending: true });

    const scopedEventRows = (eventRows ?? []) as unknown as CoreEventRow[];
    const eventIds = scopedEventRows.map((row) => row.id);

    if (eventIds.length === 0) {
      return { eventRows: [], metaSlots: [] };
    }

    const { data: metaSlotRows, error: metaSlotError } = await supabase
      .from("meta_publication_slots")
      .select(UNIFIED_META_SLOT_SELECT)
      .in("event_id", eventIds)
      .in("status", [...COMMITTED_META_SLOT_STATUSES])
      .not("scheduled_for", "is", null)
      .order("scheduled_for", { ascending: true });

    if (metaSlotError) {
      console.error(
        "Failed to load meta publication slots for calendar:",
        metaSlotError.message,
      );
    }

    return {
      eventRows: scopedEventRows,
      metaSlots: ((metaSlotRows ?? []) as unknown as MetaPublicationSlotRow[]).map(
        mapMetaPublicationSlotRow,
      ),
    };
  },
);
