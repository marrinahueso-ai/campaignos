import "server-only";

import {
  changeMondayColumnTitle,
  createMondayBoard,
  createMondayColumn,
  createMondayGroup,
  getMondayBoardDetails,
  listMondayBoards,
} from "@/lib/monday/client";
import { autoDetectColumnMap } from "@/lib/monday/column-map-detect";
import type { MondayBoardColumnMap } from "@/lib/monday/types";

export const PTO_TEMPLATE_BOARD_NAME = "PTO Event Project Planning";

const PTO_TEMPLATE_GROUPS = ["Planning", "In Progress", "Completed"] as const;

const PTO_TEMPLATE_COLUMNS: { title: string; type: string }[] = [
  { title: "VP", type: "people" },
  { title: "Priority", type: "status" },
  { title: "Project Timeline", type: "timeline" },
  { title: "Status", type: "status" },
  { title: "President", type: "people" },
  { title: "Committee", type: "people" },
  { title: "Phase", type: "status" },
  { title: "Urgency", type: "status" },
];

export type CreatePtoTemplateBoardResult =
  | {
      ok: true;
      boardId: string;
      workspaceId: string;
      columnMap: MondayBoardColumnMap;
    }
  | { ok: false; error: string };

function boardHasTemplateShape(columns: { title: string }[]): boolean {
  const titles = new Set(columns.map((column) => column.title.trim().toLowerCase()));
  return (
    titles.has("vp") &&
    titles.has("priority") &&
    titles.has("project timeline") &&
    titles.has("status") &&
    titles.has("president") &&
    titles.has("committee") &&
    titles.has("phase") &&
    titles.has("urgency")
  );
}

/** Create (or reuse) the PTO Event Project Planning board in the given workspace. */
export async function createPtoEventProjectPlanningBoard(input: {
  accessToken: string;
  workspaceId: string;
}): Promise<CreatePtoTemplateBoardResult> {
  const existingBoards = await listMondayBoards(input.accessToken, {
    workspaceIds: [input.workspaceId],
    limit: 100,
  });

  const existing = existingBoards.find((board) => board.name === PTO_TEMPLATE_BOARD_NAME);
  if (existing) {
    const details = await getMondayBoardDetails(input.accessToken, existing.id);
    if (!details) {
      return { ok: false, error: "Could not load existing PTO board." };
    }

    if (boardHasTemplateShape(details.columns)) {
      return {
        ok: true,
        boardId: existing.id,
        workspaceId: input.workspaceId,
        columnMap: autoDetectColumnMap(details.columns, {
          statusColumnId: "",
          dueDateColumnId: null,
          assigneeColumnId: null,
          eventLinkColumnId: null,
          campaignOsTaskIdColumnId: null,
          vpColumnId: null,
          presidentColumnId: null,
          committeeColumnId: null,
          priorityColumnId: null,
          phaseColumnId: null,
          urgencyColumnId: null,
          timelineColumnId: null,
          subitemStatusColumnId: null,
          subitemOwnerColumnId: null,
          subitemDateColumnId: null,
        }),
      };
    }
  }

  const boardId = await createMondayBoard({
    accessToken: input.accessToken,
    boardName: PTO_TEMPLATE_BOARD_NAME,
    workspaceId: input.workspaceId,
  });

  if (!boardId) {
    return { ok: false, error: "Monday did not create the board." };
  }

  for (const groupName of PTO_TEMPLATE_GROUPS) {
    await createMondayGroup(input.accessToken, boardId, groupName);
  }

  let details = await getMondayBoardDetails(input.accessToken, boardId);
  if (!details) {
    return { ok: false, error: "Could not load new board details." };
  }

  const nameColumn = details.columns.find((column) => column.type === "name");
  if (nameColumn) {
    await changeMondayColumnTitle(input.accessToken, boardId, nameColumn.id, "Event");
  }

  const existingTitles = new Set(
    details.columns.map((column) => column.title.trim().toLowerCase()),
  );

  for (const column of PTO_TEMPLATE_COLUMNS) {
    if (existingTitles.has(column.title.toLowerCase())) {
      continue;
    }
    await createMondayColumn({
      accessToken: input.accessToken,
      boardId,
      title: column.title,
      columnType: column.type,
    });
  }

  details = await getMondayBoardDetails(input.accessToken, boardId);
  if (!details) {
    return { ok: false, error: "Could not load board after setup." };
  }

  const columnMap = autoDetectColumnMap(details.columns, {
    statusColumnId: "",
    dueDateColumnId: null,
    assigneeColumnId: null,
    eventLinkColumnId: null,
    campaignOsTaskIdColumnId: null,
    vpColumnId: null,
    presidentColumnId: null,
    committeeColumnId: null,
    priorityColumnId: null,
    phaseColumnId: null,
    urgencyColumnId: null,
    timelineColumnId: null,
    subitemStatusColumnId: null,
    subitemOwnerColumnId: null,
    subitemDateColumnId: null,
  });

  if (!columnMap.statusColumnId) {
    return { ok: false, error: "Template board is missing a Status column." };
  }

  return {
    ok: true,
    boardId,
    workspaceId: input.workspaceId,
    columnMap,
  };
}
