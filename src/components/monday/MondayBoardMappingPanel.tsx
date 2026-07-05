"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import {
  backfillMondayTasksAction,
  getMondayBoardColumnsAction,
  getMondayBoardMappingAction,
  listMondayBoardsAction,
  saveMondayBoardMappingAction,
} from "@/lib/monday/actions";
import type { MondayBoardColumnMap, MondayBoardColumn } from "@/lib/monday/types";

interface MondayBoardMappingPanelProps {
  connected: boolean;
  syncEnabled: boolean;
}

const EMPTY_COLUMN_MAP: MondayBoardColumnMap = {
  statusColumnId: "",
  dueDateColumnId: null,
  assigneeColumnId: null,
  eventLinkColumnId: null,
  campaignOsTaskIdColumnId: null,
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
}: MondayBoardMappingPanelProps) {
  const [boards, setBoards] = useState<{ id: string; name: string; workspaceId: string | null }[]>(
    [],
  );
  const [selectedBoardId, setSelectedBoardId] = useState("");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [columns, setColumns] = useState<MondayBoardColumn[]>([]);
  const [columnMap, setColumnMap] = useState<MondayBoardColumnMap>(EMPTY_COLUMN_MAP);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!connected) {
      return;
    }

    let cancelled = false;

    async function load() {
      const [boardsResult, mappingResult] = await Promise.all([
        listMondayBoardsAction(),
        getMondayBoardMappingAction(),
      ]);

      if (cancelled) {
        return;
      }

      if (boardsResult.success && boardsResult.boards) {
        setBoards(boardsResult.boards);
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
  }, [connected]);

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
      <p className="text-sm text-cos-muted">
        Connect Monday above to select a master board and map columns.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="block space-y-1 text-sm">
          <span className="text-cos-text">Master board</span>
          <select
            value={selectedBoardId}
            onChange={(event) => handleBoardChange(event.target.value)}
            className="w-full border border-cos-border bg-cos-card px-3 py-2 text-sm text-cos-text"
          >
            <option value="">Select board…</option>
            {boards.map((board) => (
              <option key={board.id} value={board.id}>
                {board.name}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-cos-muted">
          Committee groups on this board will mirror your organization committees.
        </p>
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
