import "server-only";

import { fetchMondayBoardItemsPage } from "@/lib/monday/client";
import {
  autoDetectColumnMap,
  autoDetectSubitemColumnMap,
} from "@/lib/monday/column-map-detect";
import {
  parseMainItemColumnValues,
  parseSubitemColumnValues,
} from "@/lib/monday/column-parsers";
import { buildMondayItemUrl } from "@/lib/monday/status-mapping";
import type { MondayBoardColumnMap, MondayBoardTaskHubData } from "@/lib/monday/types";
import type { Event } from "@/types";

function normalizeCommitteeName(value: string): string {
  return value.trim().toLowerCase();
}

function itemMatchesVisibleCommittees(
  committeeLabel: string | null,
  visibleCommitteeNames: string[] | null,
): boolean {
  if (!visibleCommitteeNames) {
    return true;
  }
  if (!committeeLabel?.trim()) {
    return true;
  }
  const normalized = normalizeCommitteeName(committeeLabel);
  return visibleCommitteeNames.some(
    (name) =>
      normalized === normalizeCommitteeName(name) ||
      normalized.includes(normalizeCommitteeName(name)),
  );
}

export async function fetchMondayBoardForTaskHub(input: {
  accessToken: string;
  boardId: string;
  boardName: string;
  columnMap: MondayBoardColumnMap;
  accountSlug: string | null;
  events: Event[];
  visibleCommitteeNames: string[] | null;
}): Promise<MondayBoardTaskHubData | null> {
  const page = await fetchMondayBoardItemsPage(input.accessToken, input.boardId);
  if (!page) {
    return null;
  }

  const detectedMain = autoDetectColumnMap(page.columns, input.columnMap);
  const detectedSub = autoDetectSubitemColumnMap(page.subitemColumns, detectedMain);
  const columnMap: MondayBoardColumnMap = {
    ...detectedMain,
    ...detectedSub,
  };

  const eventsByTitle = new Map(
    input.events.map((event) => [event.title.trim().toLowerCase(), event]),
  );

  const groups = page.groups
    .map((group) => {
      const items = group.items
        .map((item) => {
          const columnValues = parseMainItemColumnValues(item.columnValues, columnMap);

          let eventId: string | null = null;
          let eventHref: string | null = null;

          const linkColumn = columnMap.eventLinkColumnId
            ? columnValues.raw[columnMap.eventLinkColumnId]
            : null;
          if (linkColumn?.value) {
            try {
              const parsed = JSON.parse(linkColumn.value) as { url?: string };
              const match = parsed.url?.match(/\/events\/([0-9a-f-]{36})/i);
              if (match?.[1]) {
                eventId = match[1];
                eventHref = `/events/${match[1]}?tab=tasks`;
              }
            } catch {
              // ignore parse errors
            }
          }

          if (!eventId) {
            const matched = eventsByTitle.get(item.name.trim().toLowerCase());
            if (matched) {
              eventId = matched.id;
              eventHref = `/events/${matched.id}?tab=tasks`;
            }
          }

          if (
            !itemMatchesVisibleCommittees(columnValues.committee, input.visibleCommitteeNames)
          ) {
            return null;
          }

          return {
            id: item.id,
            name: item.name,
            groupId: group.id,
            columnValues,
            eventId,
            eventHref,
            mondayItemUrl: buildMondayItemUrl(input.accountSlug, input.boardId, item.id),
            subitems: item.subitems.map((subitem) => {
              const subValues = parseSubitemColumnValues(subitem.columnValues, columnMap);
              const playbookTaskId =
                columnMap.campaignOsTaskIdColumnId &&
                subValues.raw[columnMap.campaignOsTaskIdColumnId]?.text
                  ? (subValues.raw[columnMap.campaignOsTaskIdColumnId]?.text ?? null)
                  : null;

              return {
                id: subitem.id,
                name: subitem.name,
                columnValues: subValues,
                playbookTaskId,
                mondayItemUrl: buildMondayItemUrl(
                  input.accountSlug,
                  input.boardId,
                  subitem.id,
                ),
              };
            }),
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      return {
        id: group.id,
        title: group.title,
        color: group.color,
        items,
      };
    })
    .filter((group) => group.items.length > 0 || !input.visibleCommitteeNames);

  return {
    boardId: input.boardId,
    boardName: input.boardName,
    subitemsBoardId: page.subitemsBoardId,
    accountSlug: input.accountSlug,
    columns: page.columns,
    columnMap,
    groups,
  };
}
