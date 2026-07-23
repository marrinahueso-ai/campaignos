import "server-only";

import { getUnifiedApprovalsSchedulingDataForEvent } from "@/lib/approvals-scheduling/queries";
import { getFilesPageDataForEvent } from "@/lib/campaign-files/queries";
import {
  areEventPlaybookTablesAvailable,
  getEventPlaybookActivityForEvent,
  getEventPlaybookNotesForEvent,
} from "@/lib/event-playbooks/queries";
import type { EventDetailTabContext } from "@/lib/events-phase3/tab-context";
import {
  elapsedMs,
  logTabTiming,
  startTabTimer,
} from "@/lib/events-phase3/tab-timing";
import { getEventActivityLogForEvent } from "@/lib/event-workspace/queries";
import { getEventInsightsPageData } from "@/lib/insights/event-queries";
import type { EventInsightsPageData } from "@/lib/insights/types";
import { getPlaybookById } from "@/lib/playbooks/queries";
import { createClient } from "@/lib/supabase/server";
import { getTasksV2PageDataForEvent } from "@/lib/tasks-v2/queries";
import { getEventVendorsData } from "@/lib/vendors/queries";
import type { UnifiedApprovalsPageData } from "@/lib/approvals-scheduling/types";
import type { FilesPageData } from "@/types/campaign-files";
import type {
  EventPlaybookActivity,
  EventPlaybookNote,
} from "@/types/event-playbooks";
import type { ActivityLogEntry } from "@/types/event-workspace";
import type { TasksV2PageData } from "@/types/tasks-v2";
import type { EventVendorsData, VendorCategory } from "@/types/vendors";

export type EventDetailLazyTab =
  | "approvals"
  | "tasks"
  | "files"
  | "notes"
  | "vendors"
  | "activity"
  | "insights";

export type EventDetailApprovalsTabData = {
  tab: "approvals";
  approvalsData: UnifiedApprovalsPageData;
};

export type EventDetailTasksTabData = {
  tab: "tasks";
  tasksV2Data: TasksV2PageData;
};

export type EventDetailFilesTabData = {
  tab: "files";
  filesPageData: FilesPageData;
};

export type EventDetailNotesTabData = {
  tab: "notes";
  notes: EventPlaybookNote[];
  tablesAvailable: boolean;
};

export type EventDetailVendorsTabData = {
  tab: "vendors";
  eventVendorsData: EventVendorsData;
  /** Empty on initial load — filled when Add Vendor / link opens. */
  vendorDirectory: {
    categories: VendorCategory[];
    events: Array<{ id: string; title: string; date: string }>;
    availableVendors: Array<{ id: string; name: string }>;
  };
};

export type EventDetailActivityTabData = {
  tab: "activity";
  playbookActivity: EventPlaybookActivity[];
  workspaceTimeline: ActivityLogEntry[];
};

export type EventDetailInsightsTabData = {
  tab: "insights";
  insightsData: EventInsightsPageData;
};

export type EventDetailTabData =
  | EventDetailApprovalsTabData
  | EventDetailTasksTabData
  | EventDetailFilesTabData
  | EventDetailNotesTabData
  | EventDetailVendorsTabData
  | EventDetailActivityTabData
  | EventDetailInsightsTabData;

export async function getEventPlaybookName(
  eventId: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_playbook_assignments")
    .select("playbook_id")
    .eq("event_id", eventId)
    .maybeSingle();

  if (error || !data?.playbook_id) {
    return null;
  }

  const playbook = await getPlaybookById(data.playbook_id as string);
  return playbook?.name ?? null;
}

export async function loadEventApprovalsTab(
  eventId: string,
  context: EventDetailTabContext,
): Promise<EventDetailApprovalsTabData> {
  const approvalsData = await getUnifiedApprovalsSchedulingDataForEvent(
    eventId,
    {
      campaignRole: context.campaignRole,
      membership: context.membership,
    },
  );
  return { tab: "approvals", approvalsData };
}

export async function loadEventTasksTab(
  eventId: string,
  context: EventDetailTabContext,
): Promise<EventDetailTasksTabData> {
  const totalStarted = startTabTimer();
  const primaryStarted = startTabTimer();
  const tasksV2Data = await getTasksV2PageDataForEvent(
    eventId,
    { title: context.event.title, date: context.event.date },
    {
      campaignRole: context.campaignRole,
      tablesAvailable: context.tablesAvailable,
    },
  );
  logTabTiming("tasks", eventId, {
    totalMs: elapsedMs(totalStarted),
    authContextMs: 0,
    primaryQueryMs: elapsedMs(primaryStarted),
    dtoMappingMs: 0,
  });
  return { tab: "tasks", tasksV2Data };
}

export async function loadEventFilesTab(
  eventId: string,
  context: EventDetailTabContext,
): Promise<EventDetailFilesTabData> {
  void eventId;
  const filesPageData = await getFilesPageDataForEvent(context.event);
  return { tab: "files", filesPageData };
}

export async function loadEventNotesTab(
  eventId: string,
  context: EventDetailTabContext,
): Promise<EventDetailNotesTabData> {
  const notes = await getEventPlaybookNotesForEvent(eventId);
  return {
    tab: "notes",
    notes,
    tablesAvailable: context.tablesAvailable,
  };
}

export async function loadEventVendorsTab(
  eventId: string,
  context: EventDetailTabContext,
): Promise<EventDetailVendorsTabData> {
  const totalStarted = startTabTimer();
  const primaryStarted = startTabTimer();
  const eventVendorsData = await getEventVendorsData(eventId, {
    organizationId: context.organizationId,
    campaignRole: context.campaignRole,
  });
  logTabTiming("vendors", eventId, {
    totalMs: elapsedMs(totalStarted),
    primaryQueryMs: elapsedMs(primaryStarted),
  });
  return {
    tab: "vendors",
    eventVendorsData,
    vendorDirectory: {
      categories: [],
      events: [],
      availableVendors: [],
    },
  };
}

export async function loadEventActivityTab(
  eventId: string,
  _context: EventDetailTabContext,
): Promise<EventDetailActivityTabData> {
  void _context;
  const [playbookActivity, workspaceTimeline] = await Promise.all([
    getEventPlaybookActivityForEvent(eventId),
    getEventActivityLogForEvent(eventId),
  ]);
  return { tab: "activity", playbookActivity, workspaceTimeline };
}

export async function loadEventInsightsTab(
  eventId: string,
  _context: EventDetailTabContext,
): Promise<EventDetailInsightsTabData> {
  void _context;
  const insightsData = await getEventInsightsPageData(eventId);
  if (!insightsData) {
    throw new Error("Unable to load event insights.");
  }
  return { tab: "insights", insightsData };
}

export async function loadEventDetailTabData(
  tab: EventDetailLazyTab,
  context: EventDetailTabContext,
): Promise<EventDetailTabData> {
  const eventId = context.event.id;

  switch (tab) {
    case "approvals":
      return loadEventApprovalsTab(eventId, context);
    case "tasks":
      return loadEventTasksTab(eventId, context);
    case "files":
      return loadEventFilesTab(eventId, context);
    case "notes":
      return loadEventNotesTab(eventId, context);
    case "vendors":
      return loadEventVendorsTab(eventId, context);
    case "activity":
      return loadEventActivityTab(eventId, context);
    case "insights":
      return loadEventInsightsTab(eventId, context);
    default: {
      const exhaustive: never = tab;
      throw new Error(`Unsupported tab: ${exhaustive}`);
    }
  }
}

/** Kept for schema probe reuse from action context building. */
export { areEventPlaybookTablesAvailable };
