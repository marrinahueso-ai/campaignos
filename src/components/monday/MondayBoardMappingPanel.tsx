"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import {
  backfillMondayTasksAction,
  createPtoTemplateBoardAction,
  getMondayBoardColumnsAction,
  listMondayBoardsAction,
  saveMondayBoardMappingAction,
} from "@/lib/monday/actions";
import { autoDetectColumnMap } from "@/lib/monday/column-map-detect";
import { PTO_TEMPLATE_BOARD_NAME } from "@/lib/monday/constants";
import type { MondayBoardColumnMap, MondayBoardColumn } from "@/lib/monday/types";

interface SavedBoardMapping {
  mondayBoardId: string;
  mondayWorkspaceId: string | null;
  columnMap: MondayBoardColumnMap;
}

interface MondayBoardSummary {
  id: string;
  name: string;
  workspaceId: string | null;
}

interface MondayBoardMappingPanelProps {
  connected: boolean;
  syncEnabled: boolean;
  justConnected?: boolean;
  savedMapping?: SavedBoardMapping | null;
  onBoardStateChange?: (update: {
    savedMapping?: SavedBoardMapping | null;
    boardConfigured?: boolean;
  }) => void;
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
  savedMapping = null,
  onBoardStateChange,
}: MondayBoardMappingPanelProps) {
  const [boards, setBoards] = useState<MondayBoardSummary[]>([]);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [selectedBoardId, setSelectedBoardId] = useState(savedMapping?.mondayBoardId ?? "");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    savedMapping?.mondayWorkspaceId ?? null,
  );
  const [columns, setColumns] = useState<MondayBoardColumn[]>([]);
  const [columnMap, setColumnMap] = useState<MondayBoardColumnMap>(
    savedMapping?.columnMap ?? EMPTY_COLUMN_MAP,
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [createTemplateError, setCreateTemplateError] = useState<string | null>(null);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const hasPtoTemplateBoard = boards.some((board) => board.name === PTO_TEMPLATE_BOARD_NAME);
  const showCreateTemplate =
    connected && loaded && (boards.length === 0 || !hasPtoTemplateBoard || Boolean(loadError));

  useEffect(() => {
    if (!connected) {
      setBoards([]);
      setWorkspaceName(null);
      setLoadError(null);
      setLoaded(false);
      return;
    }

    let cancelled = false;
    setLoaded(false);
    setLoadError(null);

    async function loadBoards() {
      try {
        const result = await listMondayBoardsAction();
        if (cancelled) {
          return;
        }

        if (result.success && result.boards) {
          setBoards(result.boards);
          setWorkspaceName(result.workspaceName ?? null);
          setLoadError(null);
          return;
        }

        const failureMessage = result.error ?? "Could not load Monday boards.";
        console.error("Monday board picker failed:", failureMessage);
        setLoadError(failureMessage);
      } catch (boardError) {
        if (cancelled) {
          return;
        }
        const failureMessage =
          boardError instanceof Error ? boardError.message : "Could not load Monday boards.";
        console.error("Monday board picker transport failed:", boardError);
        setLoadError(failureMessage);
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    }

    void loadBoards();
    return () => {
      cancelled = true;
    };
  }, [connected, justConnected]);

  useEffect(() => {
    if (savedMapping) {
      setSelectedBoardId(savedMapping.mondayBoardId);
      setSelectedWorkspaceId(savedMapping.mondayWorkspaceId);
      setColumnMap(savedMapping.columnMap);
    }
  }, [savedMapping]);

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
      } else if (result.error) {
        setError(result.error);
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

  async function handleCreateTemplateBoard() {
    setError(null);
    setMessage(null);
    setCreateTemplateError(null);
    setIsCreatingTemplate(true);

    try {
      const result = await createPtoTemplateBoardAction();
      if (!result.success) {
        const failureMessage = result.error ?? "Could not create template board.";
        setCreateTemplateError(failureMessage);
        setError(failureMessage);
        return;
      }

      const boardsResult = await listMondayBoardsAction();
      if (boardsResult.success && boardsResult.boards) {
        setBoards(boardsResult.boards);
        setWorkspaceName(boardsResult.workspaceName ?? null);
        setLoadError(null);
      } else if (result.boardId) {
        const nextBoards = boards.some((board) => board.id === result.boardId)
          ? boards
          : [
              ...boards,
              {
                id: result.boardId,
                name: PTO_TEMPLATE_BOARD_NAME,
                workspaceId: result.workspaceId ?? null,
              },
            ];
        setBoards(nextBoards);
      }

      if (result.boardId) {
        setSelectedBoardId(result.boardId);
        setSelectedWorkspaceId(result.workspaceId ?? null);
        if (result.columnMap) {
          setColumnMap(result.columnMap);
        }

        const saved: SavedBoardMapping = {
          mondayBoardId: result.boardId,
          mondayWorkspaceId: result.workspaceId ?? null,
          columnMap: result.columnMap ?? EMPTY_COLUMN_MAP,
        };
        onBoardStateChange?.({
          savedMapping: saved,
          boardConfigured: Boolean(result.columnMap?.statusColumnId),
        });
      }

      setMessage(
        `${PTO_TEMPLATE_BOARD_NAME} board is ready and mapping saved. Enable sync above when ready.`,
      );
    } catch (createError) {
      const failureMessage =
        createError instanceof Error
          ? createError.message
          : "Could not create template board.";
      setCreateTemplateError(failureMessage);
      setError(failureMessage);
    } finally {
      setIsCreatingTemplate(false);
    }
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
      const saved: SavedBoardMapping = {
        mondayBoardId: selectedBoardId,
        mondayWorkspaceId: selectedWorkspaceId,
        columnMap,
      };
      onBoardStateChange?.({
        savedMapping: saved,
        boardConfigured: Boolean(columnMap.statusColumnId),
      });
      setMessage("Board mapping saved. You can now enable Monday sync above.");
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
        <p className="font-medium text-cos-text">Step 2: Create or pick a board</p>
        <p className="mt-1">
          Complete <strong>Step 1: Connect Monday</strong> above first. You can create the{" "}
          <strong>{PTO_TEMPLATE_BOARD_NAME}</strong> template or pick an existing board.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {justConnected && (
        <p className="text-sm text-emerald-700" role="status">
          Monday connected — choose a board or create the template below.
        </p>
      )}

      {showCreateTemplate && (
        <div className="space-y-2 border border-dashed border-cos-border bg-cos-bg/40 p-4">
          <p className="text-sm text-cos-text">
            Create <strong>{PTO_TEMPLATE_BOARD_NAME}</strong> with Planning, In Progress, and
            Completed groups plus Status, Date, Assignee, Task ID, and Event link columns.
          </p>
          <Button
            type="button"
            size="sm"
            disabled={isPending || isCreatingTemplate}
            onClick={() => void handleCreateTemplateBoard()}
          >
            {isCreatingTemplate ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Creating board… (up to 60s)
              </>
            ) : (
              "Create template board"
            )}
          </Button>
          {createTemplateError && (
            <p className="text-sm text-red-600" role="alert">
              {createTemplateError}
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <label className="block space-y-1 text-sm">
          <span className="text-cos-text">Master board</span>
          <select
            value={selectedBoardId}
            onChange={(event) => handleBoardChange(event.target.value)}
            className="w-full border border-cos-border bg-cos-card px-3 py-2 text-sm text-cos-text"
            disabled={!loaded || isPending || isCreatingTemplate}
          >
            <option value="">
              {!loaded ? "Loading boards…" : loadError ? "Could not load boards" : "Select board…"}
            </option>
            {boards.map((board) => (
              <option key={board.id} value={board.id}>
                {board.name}
              </option>
            ))}
          </select>
        </label>
        {loaded && boards.length === 0 && !loadError && (
          <p className="text-sm text-cos-muted">
            No boards found in {workspaceName ?? "your default workspace"}. Create the template
            above or add a board in Monday.com.
          </p>
        )}
        {loaded && loadError && (
          <p className="text-sm text-red-600" role="alert">
            {loadError}
          </p>
        )}
        {loaded && boards.length > 0 && (
          <p className="text-xs text-cos-muted">
            Showing boards from {workspaceName ?? "your default workspace"}. Or create the template
            above.
          </p>
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
            label="Hey Ralli task ID"
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
            Optional columns
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
            Subitem columns are auto-detected when possible. Map manually if needed.
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

      {syncEnabled && (!selectedBoardId || !columnMap.statusColumnId) && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">Finish board setup before syncing</p>
          <p className="mt-1">
            Select your master board, map at least the Status column, click Save mapping, then use
            Sync now.
          </p>
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
