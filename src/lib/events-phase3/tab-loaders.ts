import "server-only";

import { getUnifiedApprovalsSchedulingDataForEvent } from "@/lib/approvals-scheduling/queries";
import { getFilesPageDataForEvent } from "@/lib/campaign-files/queries";
import {
  areEventPlaybookTablesAvailable,
  getEventPlaybookActivityForEvent,
  getEventPlaybookNotesForEvent,
} from "@/lib/event-playbooks/queries";
import { getEventActivityLogForEvent } from "@/lib/event-workspace/queries";
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
import type { Event } from "@/types";
import type { EventVendorsData, VendorCategory } from "@/types/vendors";

export type EventDetailLazyTab =
  | "approvals"
  | "tasks"
  | "files"
  | "notes"
  | "vendors"
  | "activity";

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

export type EventDetailTabData =
  | EventDetailApprovalsTabData
  | EventDetailTasksTabData
  | EventDetailFilesTabData
  | EventDetailNotesTabData
  | EventDetailVendorsTabData
  | EventDetailActivityTabData;

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
  _organizationId: string,
): Promise<EventDetailApprovalsTabData> {
  void _organizationId;
  const approvalsData = await getUnifiedApprovalsSchedulingDataForEvent(eventId);
  return { tab: "approvals", approvalsData };
}

export async function loadEventTasksTab(
  eventId: string,
  _organizationId: string,
  eventMeta: { title: string; date: string },
): Promise<EventDetailTasksTabData> {
  void _organizationId;
  const tasksV2Data = await getTasksV2PageDataForEvent(eventId, eventMeta);
  return { tab: "tasks", tasksV2Data };
}

export async function loadEventFilesTab(
  eventId: string,
  _organizationId: string,
  event: Event,
): Promise<EventDetailFilesTabData> {
  void eventId;
  void _organizationId;
  const filesPageData = await getFilesPageDataForEvent(event);
  return { tab: "files", filesPageData };
}

export async function loadEventNotesTab(
  eventId: string,
  _organizationId: string,
): Promise<EventDetailNotesTabData> {
  void _organizationId;
  const [tablesAvailable, notes] = await Promise.all([
    areEventPlaybookTablesAvailable(),
    getEventPlaybookNotesForEvent(eventId),
  ]);
  return { tab: "notes", notes, tablesAvailable };
}

export async function loadEventVendorsTab(
  eventId: string,
  _organizationId: string,
): Promise<EventDetailVendorsTabData> {
  void _organizationId;
  const eventVendorsData = await getEventVendorsData(eventId);
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
  _organizationId: string,
): Promise<EventDetailActivityTabData> {
  void _organizationId;
  const [playbookActivity, workspaceTimeline] = await Promise.all([
    getEventPlaybookActivityForEvent(eventId),
    getEventActivityLogForEvent(eventId),
  ]);
  return { tab: "activity", playbookActivity, workspaceTimeline };
}

export async function loadEventDetailTabData(
  eventId: string,
  tab: EventDetailLazyTab,
  event: Event,
  organizationId: string,
): Promise<EventDetailTabData> {
  const meta = { title: event.title, date: event.date };

  switch (tab) {
    case "approvals":
      return loadEventApprovalsTab(eventId, organizationId);
    case "tasks":
      return loadEventTasksTab(eventId, organizationId, meta);
    case "files":
      return loadEventFilesTab(eventId, organizationId, event);
    case "notes":
      return loadEventNotesTab(eventId, organizationId);
    case "vendors":
      return loadEventVendorsTab(eventId, organizationId);
    case "activity":
      return loadEventActivityTab(eventId, organizationId);
    default: {
      const exhaustive: never = tab;
      throw new Error(`Unsupported tab: ${exhaustive}`);
    }
  }
}
