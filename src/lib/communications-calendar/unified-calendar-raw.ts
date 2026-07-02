import "server-only";

import { cache } from "react";
import { resolveCalendarPlanningWindow } from "@/lib/communications-calendar/planning-date-window";
import { createClient } from "@/lib/supabase/server";
import { mapMetaPublicationSlotRow } from "@/lib/meta-publishing/mappers";
import type { MetaPublicationSlot, MetaPublicationSlotRow } from "@/lib/meta-publishing/types";
import type { EventRow as CoreEventRow } from "@/types";

export interface UnifiedCalendarRawData {
  eventRows: CoreEventRow[];
  metaSlots: MetaPublicationSlot[];
}

/** Lightweight fetch for the parent calendar — events + Meta milestones in the school-year window. */
export const fetchUnifiedCalendarRawData = cache(
  async (schoolYear?: string | null): Promise<UnifiedCalendarRawData> => {
    const window = resolveCalendarPlanningWindow(schoolYear);
    const supabase = await createClient();

    const { data: eventRows } = await supabase
      .from("events")
      .select("*")
      .gte("date", window.startDate)
      .lte("date", window.endDate)
      .neq("status", "archived")
      .order("date", { ascending: true });

    const scopedEventRows = (eventRows ?? []) as CoreEventRow[];
    const eventIds = scopedEventRows.map((row) => row.id);

    if (eventIds.length === 0) {
      return { eventRows: [], metaSlots: [] };
    }

    const { data: metaSlotRows } = await supabase
      .from("meta_publication_slots")
      .select("*")
      .in("event_id", eventIds)
      .not("scheduled_for", "is", null)
      .order("scheduled_for", { ascending: true });

    return {
      eventRows: scopedEventRows,
      metaSlots: ((metaSlotRows ?? []) as MetaPublicationSlotRow[]).map(
        mapMetaPublicationSlotRow,
      ),
    };
  },
);
