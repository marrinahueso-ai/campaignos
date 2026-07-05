import type { EventPlaybookTaskStatus } from "@/types/event-playbooks";

/** CampaignOS status → default Monday status label (user can customize labels on their board). */
const STATUS_TO_MONDAY_LABEL: Record<EventPlaybookTaskStatus, string> = {
  todo: "To Do",
  in_progress: "Working on it",
  blocked: "Stuck",
  done: "Done",
};

const MONDAY_LABEL_TO_STATUS: Record<string, EventPlaybookTaskStatus> = {
  "to do": "todo",
  "working on it": "in_progress",
  stuck: "blocked",
  done: "done",
};

export function campaignOsStatusToMondayLabel(status: EventPlaybookTaskStatus): string {
  return STATUS_TO_MONDAY_LABEL[status] ?? "To Do";
}

export function mondayLabelToCampaignOsStatus(
  label: string | null | undefined,
): EventPlaybookTaskStatus | null {
  if (!label?.trim()) {
    return null;
  }
  return MONDAY_LABEL_TO_STATUS[label.trim().toLowerCase()] ?? null;
}

export function buildMondayColumnValues(input: {
  columnMap: {
    statusColumnId: string;
    dueDateColumnId: string | null;
    assigneeColumnId: string | null;
    eventLinkColumnId: string | null;
    campaignOsTaskIdColumnId: string | null;
  };
  status: EventPlaybookTaskStatus;
  dueDate: string | null;
  taskId: string;
  eventTitle: string;
  eventUrl: string;
}): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  if (input.columnMap.statusColumnId) {
    values[input.columnMap.statusColumnId] = {
      label: campaignOsStatusToMondayLabel(input.status),
    };
  }

  if (input.columnMap.dueDateColumnId && input.dueDate) {
    values[input.columnMap.dueDateColumnId] = { date: input.dueDate };
  }

  if (input.columnMap.campaignOsTaskIdColumnId) {
    values[input.columnMap.campaignOsTaskIdColumnId] = input.taskId;
  }

  if (input.columnMap.eventLinkColumnId) {
    values[input.columnMap.eventLinkColumnId] = {
      url: input.eventUrl,
      text: input.eventTitle,
    };
  }

  return values;
}

export function parseMondayDateColumn(text: string | null, value: string | null): string | null {
  if (text?.trim()) {
    return text.trim().slice(0, 10);
  }
  if (!value) {
    return null;
  }
  try {
    const parsed = JSON.parse(value) as { date?: string };
    return parsed.date ?? null;
  } catch {
    return null;
  }
}

export function buildMondayItemUrl(
  accountSlug: string | null,
  boardId: string,
  itemId: string,
): string | null {
  if (!accountSlug) {
    return null;
  }
  return `https://${accountSlug}.monday.com/boards/${boardId}/pulses/${itemId}`;
}
