import "server-only";

import { MONDAY_API_URL } from "@/lib/monday/config";
import type {
  MondayBoardColumn,
  MondayBoardGroup,
  MondayGraphQLResponse,
} from "@/lib/monday/types";

export class MondayApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errors?: MondayGraphQLResponse<unknown>["errors"],
  ) {
    super(message);
    this.name = "MondayApiError";
  }
}

/**
 * Server-side Monday.com GraphQL client.
 * All CampaignOS UI reads/writes should go through this — never call Monday from the browser.
 */
const MONDAY_FETCH_TIMEOUT_MS = 15_000;

export async function mondayGraphQL<T>(
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      Authorization: accessToken,
      "Content-Type": "application/json",
      "API-Version": "2024-10",
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(MONDAY_FETCH_TIMEOUT_MS),
  });

  const retryAfter = response.headers.get("Retry-After");
  if (response.status === 429) {
    throw new MondayApiError(
      retryAfter
        ? `Monday rate limit exceeded. Retry after ${retryAfter}s.`
        : "Monday rate limit exceeded.",
      429,
    );
  }

  if (!response.ok) {
    const text = await response.text();
    throw new MondayApiError(
      `Monday API HTTP ${response.status}: ${text.slice(0, 200)}`,
      response.status,
    );
  }

  const payload = (await response.json()) as MondayGraphQLResponse<T>;

  if (payload.errors?.length) {
    console.error("Monday GraphQL errors:", {
      messages: payload.errors.map((entry) => entry.message),
      errors: payload.errors,
      queryPreview: query.replace(/\s+/g, " ").trim().slice(0, 240),
      variables,
    });
    throw new MondayApiError(
      payload.errors.map((e) => e.message).join("; "),
      200,
      payload.errors,
    );
  }

  if (payload.data === undefined) {
    throw new MondayApiError("Monday API returned no data.", 200);
  }

  return payload.data;
}

export interface MondayWorkspaceSummary {
  id: string;
  name: string;
  isDefault: boolean;
}

/** List workspaces the connected account can access. */
export async function listMondayWorkspaces(
  accessToken: string,
  limit = 25,
): Promise<MondayWorkspaceSummary[]> {
  const data = await mondayGraphQL<{
    workspaces: { id: string; name: string; is_default_workspace: boolean | null }[];
  }>(
    accessToken,
    `query ($limit: Int!) {
      workspaces (limit: $limit) {
        id
        name
        is_default_workspace
      }
    }`,
    { limit },
  );

  return (data.workspaces ?? []).map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    isDefault: Boolean(workspace.is_default_workspace),
  }));
}

/** Prefer the workspace selected during OAuth install (default / Main). */
export async function resolveMondayWorkspaceId(
  accessToken: string,
  workspaces?: MondayWorkspaceSummary[],
): Promise<string | null> {
  const resolvedWorkspaces = workspaces ?? (await listMondayWorkspaces(accessToken));
  if (resolvedWorkspaces.length === 0) {
    return null;
  }

  const defaultWorkspace = resolvedWorkspaces.find((workspace) => workspace.isDefault);
  if (defaultWorkspace) {
    return defaultWorkspace.id;
  }

  const mainWorkspace = resolvedWorkspaces.find((workspace) =>
    /^(main(\s+workspace)?)$/i.test(workspace.name.trim()),
  );
  if (mainWorkspace) {
    return mainWorkspace.id;
  }

  return resolvedWorkspaces[0]?.id ?? null;
}

function mergeMondayBoardSummaries(
  target: Map<string, { id: string; name: string; workspaceId: string | null }>,
  boards: { id: string; name: string; workspaceId: string | null }[],
): void {
  for (const board of boards) {
    target.set(board.id, board);
  }
}

/**
 * Boards for the settings picker — default workspace + Main only, one page each.
 * Avoids scanning every workspace (which caused Vercel timeouts and RSC digests).
 */
export async function listMondayBoardsForSettingsPicker(
  accessToken: string,
): Promise<{
  boards: { id: string; name: string; workspaceId: string | null }[];
  workspaceId: string | null;
  workspaceName: string | null;
}> {
  try {
    const workspaces = await listMondayWorkspaces(accessToken, 10);
    const workspaceId = await resolveMondayWorkspaceId(accessToken, workspaces);

    const mainWorkspace = workspaces.find((workspace) =>
      /^(main(\s+workspace)?)$/i.test(workspace.name.trim()),
    );
    const defaultWorkspace = workspaces.find((workspace) => workspace.isDefault);
    const preferredWorkspace = mainWorkspace ?? defaultWorkspace ?? workspaces[0] ?? null;

    const byId = new Map<string, { id: string; name: string; workspaceId: string | null }>();
    const queries: Promise<{ id: string; name: string; workspaceId: string | null }[]>[] = [];

    if (workspaceId) {
      queries.push(
        listMondayBoards(accessToken, {
          workspaceIds: [workspaceId],
          limit: 100,
          maxPages: 1,
        }).catch(() => []),
      );
    }

    queries.push(
      listMondayBoards(accessToken, {
        workspaceIds: [null],
        limit: 100,
        maxPages: 1,
      }).catch(() => []),
    );

    const batches = await Promise.all(queries);
    for (const batch of batches) {
      mergeMondayBoardSummaries(byId, batch);
    }

    const boards = [...byId.values()].sort((left, right) =>
      left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
    );

    return {
      boards,
      workspaceId,
      workspaceName: preferredWorkspace?.name ?? null,
    };
  } catch (error) {
    console.error("listMondayBoardsForSettingsPicker failed:", error);
    return {
      boards: [],
      workspaceId: null,
      workspaceName: null,
    };
  }
}

/**
 * List every board the token can read across workspaces, including Main (pre-migration
 * Main uses a null workspace_id and is queried with workspace_ids: [null]).
 */
export async function listAllAccessibleMondayBoards(
  accessToken: string,
  options: { limit?: number; maxPages?: number } = {},
): Promise<{ id: string; name: string; workspaceId: string | null }[]> {
  const byId = new Map<string, { id: string; name: string; workspaceId: string | null }>();

  const [allBoards, mainBoards] = await Promise.all([
    listMondayBoards(accessToken, options).catch((error) => {
      console.warn("Monday all-workspaces board query failed:", error);
      return [];
    }),
    listMondayBoards(accessToken, {
      ...options,
      workspaceIds: [null],
    }).catch((error) => {
      console.warn("Monday main-workspace board query failed:", error);
      return [];
    }),
  ]);

  mergeMondayBoardSummaries(byId, allBoards);
  mergeMondayBoardSummaries(byId, mainBoards);

  return [...byId.values()].sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
  );
}

/** List boards the connected account can access (Phase 1 settings picker). */
export async function listMondayBoards(
  accessToken: string,
  options: { limit?: number; workspaceIds?: (string | null)[]; maxPages?: number } = {},
): Promise<{ id: string; name: string; workspaceId: string | null }[]> {
  const pageSize = options.limit ?? 50;
  const workspaceIds =
    options.workspaceIds?.filter((workspaceId) => workspaceId !== undefined) ?? [];
  const maxPages = options.maxPages ?? 5;
  const boards: { id: string; name: string; workspaceId: string | null }[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const data = await mondayGraphQL<{
      boards: { id: string; name: string; workspace_id: string | null }[];
    }>(
      accessToken,
      workspaceIds.length > 0
        ? `query ($limit: Int!, $page: Int!, $workspaceIds: [ID]) {
            boards (limit: $limit, page: $page, workspace_ids: $workspaceIds, state: active) {
              id
              name
              workspace_id
            }
          }`
        : `query ($limit: Int!, $page: Int!) {
            boards (limit: $limit, page: $page, state: active) {
              id
              name
              workspace_id
            }
          }`,
      workspaceIds.length > 0
        ? { limit: pageSize, page, workspaceIds }
        : { limit: pageSize, page },
    );

    const batch = data.boards ?? [];
    boards.push(
      ...batch.map((board) => ({
        id: board.id,
        name: board.name,
        workspaceId: board.workspace_id,
      })),
    );

    if (batch.length < pageSize) {
      break;
    }
  }

  return boards;
}

export async function createMondayBoard(input: {
  accessToken: string;
  boardName: string;
  workspaceId: string;
}): Promise<string | null> {
  const data = await mondayGraphQL<{ create_board: { id: string } | null }>(
    input.accessToken,
    `mutation ($boardName: String!, $workspaceId: ID!) {
      create_board (
        board_name: $boardName,
        board_kind: public,
        workspace_id: $workspaceId
      ) {
        id
      }
    }`,
    { boardName: input.boardName, workspaceId: input.workspaceId },
  );

  return data.create_board?.id ?? null;
}

export async function createMondayColumn(input: {
  accessToken: string;
  boardId: string;
  title: string;
  columnType: string;
}): Promise<string | null> {
  const data = await mondayGraphQL<{ create_column: { id: string } | null }>(
    input.accessToken,
    `mutation ($boardId: ID!, $title: String!, $columnType: ColumnType!) {
      create_column (
        board_id: $boardId,
        title: $title,
        column_type: $columnType
      ) {
        id
      }
    }`,
    {
      boardId: input.boardId,
      title: input.title,
      columnType: input.columnType,
    },
  );

  return data.create_column?.id ?? null;
}

export async function changeMondayColumnTitle(
  accessToken: string,
  boardId: string,
  columnId: string,
  title: string,
): Promise<boolean> {
  const data = await mondayGraphQL<{ change_column_title: { id: string } | null }>(
    accessToken,
    `mutation ($boardId: ID!, $columnId: String!, $title: String!) {
      change_column_title (
        board_id: $boardId,
        column_id: $columnId,
        title: $title
      ) {
        id
      }
    }`,
    { boardId, columnId, title },
  );

  return Boolean(data.change_column_title?.id);
}

export async function fetchMondayAccountInfo(
  accessToken: string,
): Promise<{ id: string; slug: string } | null> {
  const data = await mondayGraphQL<{
    me: { account: { id: string; slug: string } | null };
  }>(
    accessToken,
    `query {
      me {
        account {
          id
          slug
        }
      }
    }`,
  );

  const account = data.me?.account;
  if (!account) {
    return null;
  }

  return { id: account.id, slug: account.slug };
}

export async function getMondayBoardDetails(
  accessToken: string,
  boardId: string,
): Promise<{
  id: string;
  name: string;
  workspaceId: string | null;
  columns: MondayBoardColumn[];
  groups: MondayBoardGroup[];
} | null> {
  const data = await mondayGraphQL<{
    boards: {
      id: string;
      name: string;
      workspace_id: string | null;
      columns: MondayBoardColumn[];
      groups: MondayBoardGroup[];
    }[];
  }>(
    accessToken,
    `query ($boardId: [ID!]!) {
      boards (ids: $boardId) {
        id
        name
        workspace_id
        columns {
          id
          title
          type
        }
        groups {
          id
          title
        }
      }
    }`,
    { boardId: [boardId] },
  );

  const board = data.boards?.[0];
  if (!board) {
    return null;
  }

  return {
    id: board.id,
    name: board.name,
    workspaceId: board.workspace_id,
    columns: board.columns ?? [],
    groups: board.groups ?? [],
  };
}

export async function createMondayGroup(
  accessToken: string,
  boardId: string,
  groupName: string,
): Promise<string | null> {
  const data = await mondayGraphQL<{ create_group: { id: string } | null }>(
    accessToken,
    `mutation ($boardId: ID!, $groupName: String!) {
      create_group (board_id: $boardId, group_name: $groupName) {
        id
      }
    }`,
    { boardId, groupName },
  );

  return data.create_group?.id ?? null;
}

export async function createMondayItem(input: {
  accessToken: string;
  boardId: string;
  groupId: string;
  itemName: string;
  columnValues: Record<string, unknown>;
}): Promise<string | null> {
  const data = await mondayGraphQL<{ create_item: { id: string } | null }>(
    input.accessToken,
    `mutation ($boardId: ID!, $groupId: String!, $itemName: String!, $columnValues: JSON!) {
      create_item (
        board_id: $boardId,
        group_id: $groupId,
        item_name: $itemName,
        column_values: $columnValues
      ) {
        id
      }
    }`,
    {
      boardId: input.boardId,
      groupId: input.groupId,
      itemName: input.itemName,
      columnValues: JSON.stringify(input.columnValues),
    },
  );

  return data.create_item?.id ?? null;
}

export async function updateMondayItem(input: {
  accessToken: string;
  boardId: string;
  itemId: string;
  itemName?: string;
  columnValues?: Record<string, unknown>;
}): Promise<boolean> {
  if (!input.itemName && !input.columnValues) {
    return true;
  }

  const data = await mondayGraphQL<{ change_multiple_column_values: { id: string } | null }>(
    input.accessToken,
    `mutation ($boardId: ID!, $itemId: ID!, $itemName: String, $columnValues: JSON) {
      change_multiple_column_values (
        board_id: $boardId,
        item_id: $itemId,
        item_name: $itemName,
        column_values: $columnValues
      ) {
        id
      }
    }`,
    {
      boardId: input.boardId,
      itemId: input.itemId,
      itemName: input.itemName ?? null,
      columnValues: input.columnValues
        ? JSON.stringify(input.columnValues)
        : null,
    },
  );

  return Boolean(data.change_multiple_column_values?.id);
}

export async function fetchMondayItemsByIds(
  accessToken: string,
  itemIds: string[],
): Promise<
  {
    id: string;
    name: string;
    boardId: string;
    groupId: string | null;
    columnValues: MondayItemColumnValue[];
  }[]
> {
  if (itemIds.length === 0) {
    return [];
  }

  const data = await mondayGraphQL<{
    items: {
      id: string;
      name: string;
      board: { id: string } | null;
      group: { id: string } | null;
      column_values: MondayItemColumnValue[];
    }[];
  }>(
    accessToken,
    `query ($itemIds: [ID!]!) {
      items (ids: $itemIds) {
        id
        name
        board {
          id
        }
        group {
          id
        }
        column_values {
          id
          type
          text
          value
        }
      }
    }`,
    { itemIds },
  );

  return (data.items ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    boardId: item.board?.id ?? "",
    groupId: item.group?.id ?? null,
    columnValues: item.column_values ?? [],
  }));
}

export interface MondayItemColumnValue {
  id: string;
  type: string;
  text: string | null;
  value: string | null;
}

export interface MondayBoardItemsPage {
  subitemsBoardId: string | null;
  columns: MondayBoardColumn[];
  subitemColumns: MondayBoardColumn[];
  groups: {
    id: string;
    title: string;
    color: string | null;
    items: {
      id: string;
      name: string;
      columnValues: MondayItemColumnValue[];
      subitems: {
        id: string;
        name: string;
        columnValues: MondayItemColumnValue[];
      }[];
    }[];
  }[];
}

/** Fetch full board structure for Task Hub (groups, items, subitems, columns). */
export async function fetchMondayBoardItemsPage(
  accessToken: string,
  boardId: string,
  itemsLimit = 500,
): Promise<MondayBoardItemsPage | null> {
  const data = await mondayGraphQL<{
    boards: {
      id: string;
      name: string;
      subitems_board_id: string | null;
      columns: MondayBoardColumn[];
      groups: {
        id: string;
        title: string;
        color: string | null;
        items_page: {
          items: {
            id: string;
            name: string;
            column_values: MondayItemColumnValue[];
            subitems: {
              id: string;
              name: string;
              column_values: MondayItemColumnValue[];
            }[];
          }[];
        };
      }[];
    }[];
  }>(
    accessToken,
    `query ($boardId: [ID!]!, $limit: Int!) {
      boards (ids: $boardId) {
        id
        name
        subitems_board_id
        columns {
          id
          title
          type
        }
        groups {
          id
          title
          color
          items_page (limit: $limit) {
            items {
              id
              name
              column_values {
                id
                type
                text
                value
              }
              subitems {
                id
                name
                column_values {
                  id
                  type
                  text
                  value
                }
              }
            }
          }
        }
      }
    }`,
    { boardId: [boardId], limit: itemsLimit },
  );

  const board = data.boards?.[0];
  if (!board) {
    return null;
  }

  let subitemColumns: MondayBoardColumn[] = [];
  if (board.subitems_board_id) {
    const subData = await mondayGraphQL<{
      boards: { id: string; columns: MondayBoardColumn[] }[];
    }>(
      accessToken,
      `query ($boardId: [ID!]!) {
        boards (ids: $boardId) {
          id
          columns {
            id
            title
            type
          }
        }
      }`,
      { boardId: [board.subitems_board_id] },
    );
    subitemColumns = subData.boards?.[0]?.columns ?? [];
  }

  return {
    subitemsBoardId: board.subitems_board_id,
    columns: board.columns ?? [],
    subitemColumns,
    groups: (board.groups ?? []).map((group) => ({
      id: group.id,
      title: group.title,
      color: group.color,
      items: (group.items_page?.items ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        columnValues: item.column_values ?? [],
        subitems: (item.subitems ?? []).map((subitem) => ({
          id: subitem.id,
          name: subitem.name,
          columnValues: subitem.column_values ?? [],
        })),
      })),
    })),
  };
}

export async function createMondaySubitem(input: {
  accessToken: string;
  parentItemId: string;
  itemName: string;
  columnValues?: Record<string, unknown>;
}): Promise<string | null> {
  const data = await mondayGraphQL<{ create_subitem: { id: string } | null }>(
    input.accessToken,
    `mutation ($parentItemId: ID!, $itemName: String!, $columnValues: JSON) {
      create_subitem (
        parent_item_id: $parentItemId,
        item_name: $itemName,
        column_values: $columnValues
      ) {
        id
      }
    }`,
    {
      parentItemId: input.parentItemId,
      itemName: input.itemName,
      columnValues: input.columnValues
        ? JSON.stringify(input.columnValues)
        : null,
    },
  );

  return data.create_subitem?.id ?? null;
}
