import "server-only";

import { getUnifiedApprovalsSchedulingData } from "@/lib/approvals-scheduling/queries";
import { getFilesPageData } from "@/lib/campaign-files/queries";
import {
  areEventPlaybookTablesAvailable,
  areEventPlaybookTaskGroupsAvailable,
  getEventPlaybookHubData,
} from "@/lib/event-playbooks/queries";
import { getEventWorkspaceData } from "@/lib/event-workspace/queries";
import { getPlaybookById } from "@/lib/playbooks/queries";
import { createClient } from "@/lib/supabase/server";
import { getTasksV2PageData } from "@/lib/tasks-v2/queries";
import {
  getEventVendorsData,
  getVendorDirectoryPageData,
} from "@/lib/vendors/queries";
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

export async function loadEventDetailTabData(
  eventId: string,
  tab: EventDetailLazyTab,
  eventMeta?: { title: string; date: string },
): Promise<EventDetailTabData> {
  switch (tab) {
    case "approvals": {
      const approvalsData = await getUnifiedApprovalsSchedulingData();
      return { tab, approvalsData };
    }
    case "tasks": {
      const tasksV2Data = await getTasksV2PageData();
      const hasEvent = tasksV2Data.events.some(
        (entry) => entry.eventId === eventId,
      );
      return {
        tab,
        tasksV2Data: hasEvent
          ? tasksV2Data
          : {
              ...tasksV2Data,
              events: [
                ...tasksV2Data.events,
                {
                  eventId,
                  eventTitle: eventMeta?.title ?? "Event",
                  eventDate: eventMeta?.date ?? "",
                },
              ],
            },
      };
    }
    case "files": {
      const filesPageData = await getFilesPageData(eventId);
      return { tab, filesPageData };
    }
    case "notes": {
      const [tablesAvailable, hubData] = await Promise.all([
        areEventPlaybookTablesAvailable(),
        getEventPlaybookHubData(eventId),
      ]);
      return {
        tab,
        notes: hubData.notes,
        tablesAvailable,
      };
    }
    case "vendors": {
      const [eventVendorsData, vendorDirectoryData] = await Promise.all([
        getEventVendorsData(eventId),
        getVendorDirectoryPageData(),
      ]);
      return {
        tab,
        eventVendorsData,
        vendorDirectory: {
          categories: vendorDirectoryData.categories,
          events: vendorDirectoryData.events,
          availableVendors: vendorDirectoryData.vendors.map((row) => ({
            id: row.vendor.id,
            name: row.vendor.name,
          })),
        },
      };
    }
    case "activity": {
      const [hubData, workspaceData] = await Promise.all([
        getEventPlaybookHubData(eventId),
        getEventWorkspaceData(eventId),
      ]);
      return {
        tab,
        playbookActivity: hubData.activity,
        workspaceTimeline: workspaceData?.timeline ?? [],
      };
    }
    default: {
      const exhaustive: never = tab;
      throw new Error(`Unsupported tab: ${exhaustive}`);
    }
  }
}

export async function getEventDetailSchemaFlags(): Promise<{
  tablesAvailable: boolean;
  taskGroupsAvailable: boolean;
}> {
  const [tablesAvailable, taskGroupsAvailable] = await Promise.all([
    areEventPlaybookTablesAvailable(),
    areEventPlaybookTaskGroupsAvailable(),
  ]);
  return { tablesAvailable, taskGroupsAvailable };
}
