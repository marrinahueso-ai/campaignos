import type { MondayBoardColumn, MondayBoardColumnMap } from "@/lib/monday/types";

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function findColumnByTitles(
  columns: MondayBoardColumn[],
  titles: string[],
  type?: string,
): MondayBoardColumn | null {
  const normalizedTitles = titles.map(normalizeTitle);
  return (
    columns.find((column) => {
      const title = normalizeTitle(column.title);
      if (type && column.type !== type) {
        return false;
      }
      return normalizedTitles.some(
        (candidate) => title === candidate || title.includes(candidate),
      );
    }) ?? null
  );
}

function findFirstColumnByType(
  columns: MondayBoardColumn[],
  type: string,
): MondayBoardColumn | null {
  return columns.find((column) => column.type === type) ?? null;
}

/** Fill unmapped column roles from common PTO board column titles. */
export function autoDetectColumnMap(
  columns: MondayBoardColumn[],
  existing: MondayBoardColumnMap,
): MondayBoardColumnMap {
  const status =
    existing.statusColumnId ||
    findColumnByTitles(columns, ["status", "event status"], "status")?.id ||
    findFirstColumnByType(columns, "status")?.id ||
    "";

  return {
    statusColumnId: status,
    dueDateColumnId:
      existing.dueDateColumnId ??
      findColumnByTitles(columns, ["due date", "date"], "date")?.id ??
      null,
    assigneeColumnId:
      existing.assigneeColumnId ??
      findColumnByTitles(columns, ["owner", "assignee"], "people")?.id ??
      null,
    eventLinkColumnId:
      existing.eventLinkColumnId ??
      findColumnByTitles(columns, ["event link", "campaignos"], "link")?.id ??
      null,
    campaignOsTaskIdColumnId:
      existing.campaignOsTaskIdColumnId ??
      findColumnByTitles(columns, ["task id", "campaignos task id"], "text")?.id ??
      null,
    vpColumnId:
      existing.vpColumnId ?? findColumnByTitles(columns, ["vp"], "people")?.id ?? null,
    presidentColumnId:
      existing.presidentColumnId ??
      findColumnByTitles(columns, ["president"], "people")?.id ??
      null,
    committeeColumnId:
      existing.committeeColumnId ??
      findColumnByTitles(columns, ["committee"], "people")?.id ??
      findColumnByTitles(columns, ["committee"], "text")?.id ??
      null,
    priorityColumnId:
      existing.priorityColumnId ??
      findColumnByTitles(columns, ["priority"], "status")?.id ??
      findColumnByTitles(columns, ["priority"], "color")?.id ??
      null,
    phaseColumnId:
      existing.phaseColumnId ??
      findColumnByTitles(columns, ["phase"], "status")?.id ??
      null,
    urgencyColumnId:
      existing.urgencyColumnId ??
      findColumnByTitles(columns, ["urgency"], "status")?.id ??
      null,
    timelineColumnId:
      existing.timelineColumnId ??
      findColumnByTitles(columns, ["project timeline", "timeline"], "timeline")?.id ??
      null,
    subitemStatusColumnId: existing.subitemStatusColumnId ?? null,
    subitemOwnerColumnId: existing.subitemOwnerColumnId ?? null,
    subitemDateColumnId: existing.subitemDateColumnId ?? null,
  };
}

/** Detect subitem board columns from a subitems board schema. */
export function autoDetectSubitemColumnMap(
  subitemColumns: MondayBoardColumn[],
  existing: MondayBoardColumnMap,
): Pick<
  MondayBoardColumnMap,
  "subitemStatusColumnId" | "subitemOwnerColumnId" | "subitemDateColumnId"
> {
  return {
    subitemStatusColumnId:
      existing.subitemStatusColumnId ??
      findColumnByTitles(subitemColumns, ["status"], "status")?.id ??
      findFirstColumnByType(subitemColumns, "status")?.id ??
      null,
    subitemOwnerColumnId:
      existing.subitemOwnerColumnId ??
      findColumnByTitles(subitemColumns, ["owner", "assignee"], "people")?.id ??
      null,
    subitemDateColumnId:
      existing.subitemDateColumnId ??
      findColumnByTitles(subitemColumns, ["date", "due date"], "date")?.id ??
      null,
  };
}
