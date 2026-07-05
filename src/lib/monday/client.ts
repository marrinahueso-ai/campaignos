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

/** List boards the connected account can access (Phase 1 settings picker). */
export async function listMondayBoards(
  accessToken: string,
  limit = 50,
): Promise<{ id: string; name: string; workspaceId: string | null }[]> {
  const data = await mondayGraphQL<{
    boards: { id: string; name: string; workspace_id: string | null }[];
  }>(
    accessToken,
    `query ($limit: Int!) {
      boards (limit: $limit) {
        id
        name
        workspace_id
      }
    }`,
    { limit },
  );

  return (data.boards ?? []).map((board) => ({
    id: board.id,
    name: board.name,
    workspaceId: board.workspace_id,
  }));
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

export interface MondayItemColumnValue {
  id: string;
  type: string;
  text: string | null;
  value: string | null;
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
