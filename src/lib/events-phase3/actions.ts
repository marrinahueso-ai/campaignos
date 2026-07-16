"use server";

import { getEventById } from "@/lib/events/queries";
import {
  loadEventDetailTabData,
  type EventDetailLazyTab,
  type EventDetailTabData,
} from "@/lib/events-phase3/tab-loaders";

const LAZY_TABS = new Set<EventDetailLazyTab>([
  "approvals",
  "tasks",
  "files",
  "notes",
  "vendors",
  "activity",
]);

export async function loadEventDetailTabAction(
  eventId: string,
  tab: string,
): Promise<{ success: true; data: EventDetailTabData } | { success: false; error: string }> {
  if (!LAZY_TABS.has(tab as EventDetailLazyTab)) {
    return { success: false, error: "Unsupported tab." };
  }

  const event = await getEventById(eventId);
  if (!event) {
    return { success: false, error: "Event not found." };
  }

  try {
    const data = await loadEventDetailTabData(eventId, tab as EventDetailLazyTab, {
      title: event.title,
      date: event.date,
    });
    return { success: true, data };
  } catch (error) {
    console.error("Failed to load event detail tab:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to load tab.",
    };
  }
}
