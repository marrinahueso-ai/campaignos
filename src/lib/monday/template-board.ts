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
import { PTO_TEMPLATE_BOARD_NAME } from "@/lib/monday/constants";
import type { MondayBoardColumnMap } from "@/lib/monday/types";

export { PTO_TEMPLATE_BOARD_NAME };

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

const EMPTY_COLUMN_MAP: MondayBoardColumnMap = {
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
};

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

function formatMondayError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

async function ensurePtoBoardGroups(
  accessToken: string,
  boardId: string,
  existingGroupTitles: string[],
): Promise<void> {
  const existing = new Set(existingGroupTitles.map((title) => title.trim().toLowerCase()));

  for (const groupName of PTO_TEMPLATE_GROUPS) {
    if (existing.has(groupName.toLowerCase())) {
      continue;
    }
    await createMondayGroup(accessToken, boardId, groupName);
  }
}

async function ensurePtoBoardColumns(
  accessToken: string,
  boardId: string,
  columns: { id: string; title: string; type: string }[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const nameColumn = columns.find((column) => column.type === "name");
  if (nameColumn && nameColumn.title.trim().toLowerCase() !== "event") {
    try {
      await changeMondayColumnTitle(accessToken, boardId, nameColumn.id, "Event");
    } catch (error) {
      console.warn("Could not rename Monday name column to Event:", error);
    }
  }

  const existingTitles = new Set(columns.map((column) => column.title.trim().toLowerCase()));
  const missingColumns = PTO_TEMPLATE_COLUMNS.filter(
    (column) => !existingTitles.has(column.title.toLowerCase()),
  );

  const results = await Promise.allSettled(
    missingColumns.map((column) =>
      createMondayColumn({
        accessToken,
        boardId,
        title: column.title,
        columnType: column.type,
      }),
    ),
  );

  const failedColumns = results
    .map((result, index) =>
      result.status === "rejected" ? missingColumns[index]?.title : null,
    )
    .filter((title): title is string => Boolean(title));

  if (failedColumns.length > 0) {
    console.warn("Some PTO template columns could not be created:", failedColumns);
  }

  return { ok: true };
}

async function finalizePtoBoardSetup(input: {
  accessToken: string;
  boardId: string;
  workspaceId: string;
}): Promise<CreatePtoTemplateBoardResult> {
  const details = await getMondayBoardDetails(input.accessToken, input.boardId);
  if (!details) {
    return { ok: false, error: "Could not load board after setup." };
  }

  const columnMap = autoDetectColumnMap(details.columns, EMPTY_COLUMN_MAP);
  if (!columnMap.statusColumnId) {
    return { ok: false, error: "Template board is missing a Status column." };
  }

  return {
    ok: true,
    boardId: input.boardId,
    workspaceId: input.workspaceId,
    columnMap,
  };
}

async function completePtoBoardSetup(input: {
  accessToken: string;
  boardId: string;
  workspaceId: string;
}): Promise<CreatePtoTemplateBoardResult> {
  let details = await getMondayBoardDetails(input.accessToken, input.boardId);
  if (!details) {
    return { ok: false, error: "Could not load existing PTO board." };
  }

  if (boardHasTemplateShape(details.columns)) {
    return finalizePtoBoardSetup(input);
  }

  await ensurePtoBoardGroups(
    input.accessToken,
    input.boardId,
    details.groups.map((group) => group.title),
  );

  details = (await getMondayBoardDetails(input.accessToken, input.boardId)) ?? details;
  const columnResult = await ensurePtoBoardColumns(
    input.accessToken,
    input.boardId,
    details.columns,
  );
  if (!columnResult.ok) {
    return columnResult;
  }

  return finalizePtoBoardSetup(input);
}

/** Create (or reuse / resume) the PTO Event Project Planning board in the given workspace. */
export async function createPtoEventProjectPlanningBoard(input: {
  accessToken: string;
  workspaceId: string;
}): Promise<CreatePtoTemplateBoardResult> {
  try {
    const existingBoards = await listMondayBoards(input.accessToken, {
      workspaceIds: [input.workspaceId],
      limit: 100,
    });

    const existing = existingBoards.find((board) => board.name === PTO_TEMPLATE_BOARD_NAME);
    if (existing) {
      return completePtoBoardSetup({
        accessToken: input.accessToken,
        boardId: existing.id,
        workspaceId: input.workspaceId,
      });
    }

    const boardId = await createMondayBoard({
      accessToken: input.accessToken,
      boardName: PTO_TEMPLATE_BOARD_NAME,
      workspaceId: input.workspaceId,
    });

    if (!boardId) {
      return { ok: false, error: "Monday did not create the board." };
    }

    return completePtoBoardSetup({
      accessToken: input.accessToken,
      boardId,
      workspaceId: input.workspaceId,
    });
  } catch (error) {
    console.error("createPtoEventProjectPlanningBoard failed:", error);
    return {
      ok: false,
      error: formatMondayError(error, "Could not create template board."),
    };
  }
}
