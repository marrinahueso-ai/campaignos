import "server-only";

import { MONDAY_API_URL } from "@/lib/monday/config";
import type { MondayGraphQLResponse } from "@/lib/monday/types";

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
