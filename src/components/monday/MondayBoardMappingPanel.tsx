"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import {
  backfillMondayTasksAction,
  createPtoTemplateBoardAction,
  getMondayBoardColumnsAction,
  getMondayBoardMappingAction,
  listMondayBoardsAction,
  PTO_TEMPLATE_BOARD_NAME,
  saveMondayBoardMappingAction,
} from "@/lib/monday/actions";
import { autoDetectColumnMap } from "@/lib/monday/column-map-detect";
import type { MondayBoardColumnMap, MondayBoardColumn } from "@/lib/monday/types";

interface MondayBoardMappingPanelProps {
  connected: boolean;
  syncEnabled: boolean;
  justConnected?: boolean;
}

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

function columnsByType(columns: MondayBoardColumn[], type: string): MondayBoardColumn[] {
  return columns.filter((column) => column.type === type);
}

function ColumnSelect({
  label,
  value,
  columns,
  required,
  onChange,
}: {
  label: string;
  value: string | null;
  columns: MondayBoardColumn[];
  required?: boolean;
  onChange: (value: string | null) => void;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-cos-text">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        className="w-full border border-cos-border bg-cos-card px-3 py-2 text-sm text-cos-text"
      >
        <option value="">{required ? "Select column…" : "None"}</option>
        {columns.map((column) => (
          <option key={column.id} value={column.id}>
            {column.title} ({column.type})
          </option>
        ))}
      </select>
    </label>
  );
}

export function MondayBoardMappingPanel({
  connected,
  syncEnabled,
  justConnected = false,
}: MondayBoardMappingPanelProps) {
  const [boards, setBoards] = useState<{ id: string; name: string; workspaceId: string | null }[]>(
    [],
  );
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [selectedBoardId, setSelectedBoardId] = useState("");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [columns, setColumns] = useState<MondayBoardColumn[]>([]);
  const [columnMap, setColumnMap] = useState<MondayBoardColumnMap>(EMPTY_COLUMN_MAP);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(false);

  const hasPtoTemplateBoard = boards.some((board) => board.name === PTO_TEMPLATE_BOARD_NAME);
  const showCreateTemplate = connected && loaded && (boards.length === 0 || !hasPtoTemplateBoard);

  useEffect(() => {
    if (!connected) {
      setLoaded(false);
      setBoards([]);
      setError(null);
      return;
    }

    let cancelled = false;

    async function load() {
      setError(null);
      setLoaded(false);

      const [boardsResult, mappingResult] = await Promise.all([
        listMondayBoardsAction(),
        getMondayBoardMappingAction(),
      ]);

      if (cancelled) {
        return;
      }

      if (boardsResult.success && boardsResult.boards) {
        setBoards(boardsResult.boards);
        setWorkspaceName(boardsResult.workspaceName ?? null);
        if (boardsResult.workspaceId && !mappingResult.mapping) {
          setSelectedWorkspaceId(boardsResult.workspaceId);
        }
      } else {
        setBoards([]);
        setError(boardsResult.error ?? "Could not load Monday boards.");
      }

      if (mappingResult.mapping) {
        setSelectedBoardId(mappingResult.mapping.mondayBoardId);
        setSelectedWorkspaceId(mappingResult.mapping.mondayWorkspaceId);
        setColumnMap(mappingResult.mapping.columnMap);
      }

      setLoaded(true);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [connected, justConnected]);

  useEffect(() => {
    if (!connected || !selectedBoardId || !loaded) {
      return;
    }

    let cancelled = false;

    async function loadColumns() {
      const result = await getMondayBoardColumnsAction(selectedBoardId);
      if (cancelled) {
        return;
      }
      if (result.success && result.columns) {
        setColumns(result.columns);
        setColumnMap((current) => {
          if (current.statusColumnId) {
            return current;
          }
          return autoDetectColumnMap(result.columns ?? [], EMPTY_COLUMN_MAP);
        });
      }
    }

    void loadColumns();
    return () => {
      cancelled = true;
    };
  }, [connected, selectedBoardId, loaded]);

  function handleBoardChange(boardId: string) {
    setSelectedBoardId(boardId);
    const board = boards.find((entry) => entry.id === boardId);
    setSelectedWorkspaceId(board?.workspaceId ?? null);
    setColumnMap(EMPTY_COLUMN_MAP);
  }

  function handleCreateTemplateBoard() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await createPtoTemplateBoardAction();
      if (!result.success) {
        setError(result.error ?? "Could not create template board.");
        return;
      }

      if (result.boardId) {
        setBoards((current) => {
          const exists = current.some((board) => board.id === result.boardId);
          if (exists) {
            return current;
          }
          return [
            ...current,
            {
              id: result.boardId!,
              name: PTO_TEMPLATE_BOARD_NAME,
              workspaceId: result.workspaceId ?? null,
            },
          ];
        });
        setSelectedBoardId(result.boardId);
        setSelectedWorkspaceId(result.workspaceId ?? null);
        if (result.columnMap) {
          setColumnMap(result.columnMap);
        }
      }

      setMessage(`${PTO_TEMPLATE_BOARD_NAME} board is ready. Review the column mapping below.`);
    });
  }

  function handleSaveMapping() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await saveMondayBoardMappingAction({
        mondayBoardId: selectedBoardId,
        mondayWorkspaceId: selectedWorkspaceId,
        columnMap,
      });
      if (!result.success) {
        setError(result.error ?? "Could not save mapping.");
        return;
      }
      setMessage("Board mapping saved.");
    });
  }

  function handleBackfill() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await backfillMondayTasksAction();
      if (!result.success) {
        setError(result.error ?? "Backfill failed.");
        return;
      }
      setMessage(
        `Sync complete: ${result.created ?? 0} created, ${result.skipped ?? 0} skipped, ${result.failed ?? 0} failed.`,
      );
    });
  }

  if (!connected) {
    return (
      <div className="rounded-md border border-dashed border-cos-border bg-cos-bg/40 p-4 text-sm text-cos-muted">
        <p className="font-medium text-cos-text">Step 2: Pick a master board</p>
        <p className="mt-1">
          Complete <strong>Step 1: Connect Monday</strong> above first. Your boards (including{" "}
          <strong>{PTO_TEMPLATE_BOARD_NAME}</strong>) appear here after OAuth finishes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {justConnected && (
        <p className="text-sm text-emerald-700" role="status">
          Monday connected — loading your boards…
        </p>
      )}
      <div className="space-y-2">
        <label className="block space-y-1 text-sm">
          <span className="text-cos-text">Master board</span>
          <select
            value={selectedBoardId}
            onChange={(event) => handleBoardChange(event.target.value)}
            className="w-full border border-cos-border bg-cos-card px-3 py-2 text-sm text-cos-text"
            disabled={!loaded || isPending}
          >
            <option value="">
              {loaded ? "Select board…" : "Loading boards…"}
            </option>
            {boards.map((board) => (
              <option key={board.id} value={board.id}>
                {board.name}
              </option>
            ))}
          </select>
        </label>
        {loaded && boards.length === 0 && !error && (
          <p className="text-sm text-cos-muted">
            No boards found in {workspaceName ?? "your connected workspace"} — create one in
            Monday or click Create template board below.
          </p>
        )}
        {loaded && boards.length > 0 && (
          <p className="text-xs text-cos-muted">
            Showing boards from {workspaceName ?? "your connected workspace"}. Committee groups on
            this board will mirror your organization committees.
          </p>
        )}
        {showCreateTemplate && (
          <div className="space-y-2 border border-dashed border-cos-border bg-cos-bg/40 p-4">
            <p className="text-sm text-cos-text">
              CampaignOS expects a <strong>{PTO_TEMPLATE_BOARD_NAME}</strong> board with Planning,
              In Progress, and Completed groups.
            </p>
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={handleCreateTemplateBoard}
            >
              Create template board
            </Button>
          </div>
        )}
      </div>

      {selectedBoardId && columns.length > 0 && (
        <div className="space-y-4 border border-cos-border bg-cos-bg/40 p-4">
          <p className="text-sm font-medium text-cos-text">Column mapping</p>
          <ColumnSelect
            label="Status"
            required
            value={columnMap.statusColumnId}
            columns={columnsByType(columns, "status")}
            onChange={(value) =>
              setColumnMap((current) => ({
                ...current,
                statusColumnId: value ?? "",
              }))
            }
          />
          <ColumnSelect
            label="Due date"
            value={columnMap.dueDateColumnId}
            columns={columnsByType(columns, "date")}
            onChange={(value) =>
              setColumnMap((current) => ({ ...current, dueDateColumnId: value }))
            }
          />
          <ColumnSelect
            label="Assignee"
            value={columnMap.assigneeColumnId}
            columns={columnsByType(columns, "people")}
            onChange={(value) =>
              setColumnMap((current) => ({ ...current, assigneeColumnId: value }))
            }
          />
          <ColumnSelect
            label="CampaignOS task ID"
            value={columnMap.campaignOsTaskIdColumnId}
            columns={columnsByType(columns, "text")}
            onChange={(value) =>
              setColumnMap((current) => ({
                ...current,
                campaignOsTaskIdColumnId: value,
              }))
            }
          />
          <ColumnSelect
            label="Event link"
            value={columnMap.eventLinkColumnId}
            columns={columnsByType(columns, "link")}
            onChange={(value) =>
              setColumnMap((current) => ({ ...current, eventLinkColumnId: value }))
            }
          />

          <p className="border-t border-cos-border pt-3 text-xs font-semibold tracking-wide text-cos-muted uppercase">
            Main item columns (PTO board)
          </p>
          <ColumnSelect
            label="VP"
            value={columnMap.vpColumnId}
            columns={columnsByType(columns, "people")}
            onChange={(value) =>
              setColumnMap((current) => ({ ...current, vpColumnId: value }))
            }
          />
          <ColumnSelect
            label="President"
            value={columnMap.presidentColumnId}
            columns={columnsByType(columns, "people")}
            onChange={(value) =>
              setColumnMap((current) => ({ ...current, presidentColumnId: value }))
            }
          />
          <ColumnSelect
            label="Committee"
            value={columnMap.committeeColumnId}
            columns={[
              ...columnsByType(columns, "people"),
              ...columnsByType(columns, "text"),
            ]}
            onChange={(value) =>
              setColumnMap((current) => ({ ...current, committeeColumnId: value }))
            }
          />
          <ColumnSelect
            label="Priority"
            value={columnMap.priorityColumnId}
            columns={[
              ...columnsByType(columns, "status"),
              ...columnsByType(columns, "color"),
            ]}
            onChange={(value) =>
              setColumnMap((current) => ({ ...current, priorityColumnId: value }))
            }
          />
          <ColumnSelect
            label="Phase"
            value={columnMap.phaseColumnId}
            columns={columnsByType(columns, "status")}
            onChange={(value) =>
              setColumnMap((current) => ({ ...current, phaseColumnId: value }))
            }
          />
          <ColumnSelect
            label="Urgency"
            value={columnMap.urgencyColumnId}
            columns={columnsByType(columns, "status")}
            onChange={(value) =>
              setColumnMap((current) => ({ ...current, urgencyColumnId: value }))
            }
          />
          <ColumnSelect
            label="Project timeline"
            value={columnMap.timelineColumnId}
            columns={columns.filter((column) => column.type === "timeline")}
            onChange={(value) =>
              setColumnMap((current) => ({ ...current, timelineColumnId: value }))
            }
          />

          <p className="border-t border-cos-border pt-3 text-xs text-cos-muted">
            Subitem columns are auto-detected from your board&apos;s subitems board when
            possible. Map manually if auto-detect misses them.
          </p>
          <ColumnSelect
            label="Subitem status"
            value={columnMap.subitemStatusColumnId}
            columns={columnsByType(columns, "status")}
            onChange={(value) =>
              setColumnMap((current) => ({ ...current, subitemStatusColumnId: value }))
            }
          />
          <ColumnSelect
            label="Subitem owner"
            value={columnMap.subitemOwnerColumnId}
            columns={columnsByType(columns, "people")}
            onChange={(value) =>
              setColumnMap((current) => ({ ...current, subitemOwnerColumnId: value }))
            }
          />
          <ColumnSelect
            label="Subitem date"
            value={columnMap.subitemDateColumnId}
            columns={columnsByType(columns, "date")}
            onChange={(value) =>
              setColumnMap((current) => ({ ...current, subitemDateColumnId: value }))
            }
          />
          <Button
            type="button"
            size="sm"
            disabled={isPending || !columnMap.statusColumnId}
            onClick={handleSaveMapping}
          >
            Save mapping
          </Button>
        </div>
      )}

      {syncEnabled && selectedBoardId && columnMap.statusColumnId && (
        <div className="space-y-2">
          <p className="text-sm text-cos-muted">
            Push all open playbook tasks that are not yet linked to Monday items. Existing links
            are skipped.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isPending}
            onClick={handleBackfill}
          >
            Sync now
          </Button>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="text-sm text-emerald-700" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
