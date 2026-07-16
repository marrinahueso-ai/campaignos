"use server";

import { getActiveMembership } from "@/lib/auth/membership-queries";
import { getAuthUser } from "@/lib/auth/queries";
import { getEventById } from "@/lib/events/queries";
import {
  loadEventDetailTabData,
  type EventDetailLazyTab,
  type EventDetailTabData,
} from "@/lib/events-phase3/tab-loaders";
import { getVendorDirectoryPickerData } from "@/lib/vendors/queries";

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
): Promise<
  { success: true; data: EventDetailTabData } | { success: false; error: string }
> {
  if (!LAZY_TABS.has(tab as EventDetailLazyTab)) {
    return { success: false, error: "Unsupported tab." };
  }

  const user = await getAuthUser();
  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const membership = await getActiveMembership();
  if (!membership) {
    return { success: false, error: "No active organization membership." };
  }

  const event = await getEventById(eventId);
  if (!event) {
    return { success: false, error: "Event not found." };
  }

  try {
    const data = await loadEventDetailTabData(
      eventId,
      tab as EventDetailLazyTab,
      event,
      membership.organizationId,
    );
    return { success: true, data };
  } catch (error) {
    console.error("Failed to load event detail tab:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to load tab.",
    };
  }
}

/** Lazy vendor directory for Event Detail Add Existing / Create New. */
export async function loadEventVendorDirectoryAction(): Promise<
  | {
      success: true;
      data: {
        categories: Awaited<
          ReturnType<typeof getVendorDirectoryPickerData>
        >["categories"];
        events: Awaited<ReturnType<typeof getVendorDirectoryPickerData>>["events"];
        availableVendors: Awaited<
          ReturnType<typeof getVendorDirectoryPickerData>
        >["availableVendors"];
      };
    }
  | { success: false; error: string }
> {
  const user = await getAuthUser();
  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const membership = await getActiveMembership();
  if (!membership) {
    return { success: false, error: "No active organization membership." };
  }

  try {
    const data = await getVendorDirectoryPickerData();
    return { success: true, data };
  } catch (error) {
    console.error("Failed to load vendor directory picker:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unable to load vendor directory.",
    };
  }
}
