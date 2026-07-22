"use server";

import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { getAuthUser } from "@/lib/auth/queries";
import { getEventById } from "@/lib/events/queries";
import type { EventDetailTabContext } from "@/lib/events-phase3/tab-context";
import {
  elapsedMs,
  logTabTiming,
  startTabTimer,
} from "@/lib/events-phase3/tab-timing";
import { getEventDetailHeroStats } from "@/lib/events-phase3/hero-stats";
import {
  areEventPlaybookTablesAvailable,
  loadEventDetailTabData,
  type EventDetailLazyTab,
  type EventDetailTabData,
} from "@/lib/events-phase3/tab-loaders";
import { getVendorDirectoryPickerData } from "@/lib/vendors/queries";
import type { EventDetailHeroStats } from "@/components/events-phase3/EventDetailHeroStatsStrip";

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

  const totalStarted = startTabTimer();
  const authStarted = startTabTimer();

  const [user, membership, campaignRole, tablesAvailable] = await Promise.all([
    getAuthUser(),
    getActiveMembership(),
    getCurrentCampaignRole(),
    areEventPlaybookTablesAvailable(),
  ]);

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  if (!membership) {
    return { success: false, error: "No active organization membership." };
  }

  const event = await getEventById(eventId);
  if (!event) {
    return { success: false, error: "Event not found." };
  }

  const authContextMs = elapsedMs(authStarted);

  const context: EventDetailTabContext = {
    user,
    membership,
    organizationId: membership.organizationId,
    event,
    campaignRole,
    tablesAvailable,
  };

  try {
    const loaderStarted = startTabTimer();
    const data = await loadEventDetailTabData(
      tab as EventDetailLazyTab,
      context,
    );
    logTabTiming(tab, eventId, {
      totalMs: elapsedMs(totalStarted),
      authContextMs,
      primaryQueryMs: elapsedMs(loaderStarted),
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

/** Refresh hero strip counts after Approvals/Tasks/Volunteers mutations. */
export async function refreshEventDetailHeroStatsAction(
  eventId: string,
): Promise<
  | { success: true; data: EventDetailHeroStats }
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

  const event = await getEventById(eventId);
  if (!event) {
    return { success: false, error: "Event not found." };
  }

  try {
    const data = await getEventDetailHeroStats(eventId);
    return { success: true, data };
  } catch (error) {
    console.error("Failed to refresh event hero stats:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to refresh stats.",
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
