"use client";

import Link from "next/link";
import { Fragment, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, ExternalLink, Plus } from "lucide-react";
import { MondayLabelPill } from "@/components/task-hub/MondayLabelPill";
import { MondayPeopleAvatars } from "@/components/task-hub/MondayPeopleAvatars";
import { MondayTimelineBar } from "@/components/task-hub/MondayTimelineBar";
import { TaskHubMondayToolbar } from "@/components/task-hub/TaskHubMondayToolbar";
import {
  createMondayBoardEventAction,
  createMondayBoardSubitemAction,
  updateMondayBoardItemColumnAction,
} from "@/lib/monday/board-actions";
import type { MondayBoardColumnMap, MondayBoardTaskHubData } from "@/lib/monday/types";
import {
  collectStatusLabels,
  countGroupPriorityDistribution,
  countGroupStatusDistribution,
  countMondayBoardItems,
  filterMondayBoardGroups,
  type MondayBoardSortMode,
  type MondayBoardStatusFilter,
} from "@/lib/task-hub/monday-filters";
import { cn } from "@/lib/utils/cn";
import type { TaskHubEventOption, TaskHubOrgMember } from "@/types/task-hub";

const PRIORITY_OPTIONS = ["Low", "High"];
const PHASE_OPTIONS = ["Planning", "In Progress", "Completed"];
const URGENCY_OPTIONS = ["Low", "Medium", "High"];
const STATUS_OPTIONS = ["Not Started", "Working on it", "Done", "Stuck"];
const SUBITEM_STATUS_OPTIONS = ["Not Started", "Working on it", "Done"];

const GROUP_ACCENT: Record<string, string> = {
  "done-green": "#5f735f",
  orange: "#c87d3a",
  "sky-blue": "#4a7fb5",
  purple: "#7a5f9e",
  red: "#b86b55",
};

function groupAccentColor(color: string | null): string {
  if (!color) {
    return "var(--cos-accent)";
  }
  if (color.startsWith("#")) {
    return color;
  }
  return GROUP_ACCENT[color] ?? "var(--cos-accent)";
}

interface TaskHubMondayBoardProps {
  board: MondayBoardTaskHubData;
  canEdit: boolean;
  orgMembers: TaskHubOrgMember[];
  events: TaskHubEventOption[];
}

interface ColumnDef {
  id: string;
  label: string;
  render: (item: MondayBoardTaskHubData["groups"][0]["items"][0]) => ReactNode;
}

function buildColumns(
  columnMap: MondayBoardColumnMap,
  canEdit: boolean,
  onUpdateStatus: (
    itemId: string,
    columnId: string,
    label: string,
  ) => void,
  pendingIds: Set<string>,
): ColumnDef[] {
  const columns: ColumnDef[] = [];

  if (columnMap.vpColumnId) {
    columns.push({
      id: "vp",
      label: "VP",
      render: (item) => (
        <MondayPeopleAvatars people={item.columnValues.vp} max={2} />
      ),
    });
  }

  if (columnMap.priorityColumnId) {
    columns.push({
      id: "priority",
      label: "Priority",
      render: (item) => (
        <MondayLabelPill
          label={item.columnValues.priority}
          options={PRIORITY_OPTIONS}
          disabled={!canEdit || pendingIds.has(item.id)}
          onChange={
            canEdit
              ? (label) => onUpdateStatus(item.id, columnMap.priorityColumnId!, label)
              : undefined
          }
        />
      ),
    });
  }

  if (columnMap.timelineColumnId) {
    columns.push({
      id: "timeline",
      label: "Project Timeline",
      render: (item) => <MondayTimelineBar timeline={item.columnValues.timeline} />,
    });
  }

  if (columnMap.statusColumnId) {
    columns.push({
      id: "status",
      label: "Status",
      render: (item) => (
        <MondayLabelPill
          label={item.columnValues.status}
          options={STATUS_OPTIONS}
          disabled={!canEdit || pendingIds.has(item.id)}
          onChange={
            canEdit
              ? (label) => onUpdateStatus(item.id, columnMap.statusColumnId, label)
              : undefined
          }
        />
      ),
    });
  }

  if (columnMap.presidentColumnId) {
    columns.push({
      id: "president",
      label: "President",
      render: (item) => (
        <MondayPeopleAvatars people={item.columnValues.president} max={1} />
      ),
    });
  }

  if (columnMap.committeeColumnId) {
    columns.push({
      id: "committee",
      label: "Committee",
      render: (item) => (
        <span className="text-xs text-cos-text">
          {item.columnValues.committee ?? "—"}
        </span>
      ),
    });
  }

  if (columnMap.phaseColumnId) {
    columns.push({
      id: "phase",
      label: "Phase",
      render: (item) => (
        <MondayLabelPill
          label={item.columnValues.phase}
          options={PHASE_OPTIONS}
          disabled={!canEdit || pendingIds.has(item.id)}
          onChange={
            canEdit
              ? (label) => onUpdateStatus(item.id, columnMap.phaseColumnId!, label)
              : undefined
          }
        />
      ),
    });
  }

  if (columnMap.urgencyColumnId) {
    columns.push({
      id: "urgency",
      label: "Urgency",
      render: (item) => (
        <MondayLabelPill
          label={item.columnValues.urgency}
          options={URGENCY_OPTIONS}
          disabled={!canEdit || pendingIds.has(item.id)}
          onChange={
            canEdit
              ? (label) => onUpdateStatus(item.id, columnMap.urgencyColumnId!, label)
              : undefined
          }
        />
      ),
    });
  }

  return columns;
}

export function TaskHubMondayBoard({
  board,
  canEdit,
  orgMembers,
  events,
}: TaskHubMondayBoardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<MondayBoardSortMode>("default");
  const [statusFilter, setStatusFilter] = useState<MondayBoardStatusFilter>("all");
  const [personFilter, setPersonFilter] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => new Set());
  const [pendingItemIds, setPendingItemIds] = useState<Set<string>>(() => new Set());
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(() => new Set());
  const [showNewEventForGroup, setShowNewEventForGroup] = useState<string | null>(null);
  const [newEventName, setNewEventName] = useState("");
  const [newEventLinkId, setNewEventLinkId] = useState("");
  const [addingSubitemFor, setAddingSubitemFor] = useState<string | null>(null);
  const [newSubitemName, setNewSubitemName] = useState("");

  const statusOptions = useMemo(() => collectStatusLabels(board.groups), [board.groups]);

  const filteredGroups = useMemo(
    () =>
      filterMondayBoardGroups(board.groups, {
        searchQuery,
        statusFilter,
        sortMode,
        personFilter: personFilter || null,
      }),
    [board.groups, searchQuery, sortMode, statusFilter, personFilter],
  );

  const totalItems = countMondayBoardItems(board.groups);
  const filteredItems = countMondayBoardItems(filteredGroups);

  function handleUpdateStatus(itemId: string, columnId: string, label: string) {
    setPendingItemIds((current) => new Set(current).add(itemId));
    startTransition(async () => {
      const result = await updateMondayBoardItemColumnAction({
        itemId,
        columnId,
        columnType: "status",
        value: label,
      });
      setPendingItemIds((current) => {
        const next = new Set(current);
        next.delete(itemId);
        return next;
      });
      if (result.success) {
        router.refresh();
      }
    });
  }

  const columns = buildColumns(
    board.columnMap,
    canEdit,
    handleUpdateStatus,
    pendingItemIds,
  ).filter((column) => !hiddenColumns.has(column.id));

  function toggleGroup(groupId: string) {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }

  function toggleItem(itemId: string) {
    setExpandedItems((current) => {
      const next = new Set(current);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }

  function handleCreateEvent(groupId: string) {
    if (!newEventName.trim()) {
      return;
    }
    const linkedEvent = events.find((event) => event.eventId === newEventLinkId);
    startTransition(async () => {
      const result = await createMondayBoardEventAction({
        groupId,
        itemName: newEventName.trim(),
        eventId: linkedEvent?.eventId ?? null,
        eventTitle: linkedEvent?.eventTitle ?? null,
      });
      if (result.success) {
        setShowNewEventForGroup(null);
        setNewEventName("");
        setNewEventLinkId("");
        router.refresh();
      }
    });
  }

  function handleCreateSubitem(parentItemId: string) {
    if (!newSubitemName.trim()) {
      return;
    }
    startTransition(async () => {
      const result = await createMondayBoardSubitemAction({
        parentItemId,
        itemName: newSubitemName.trim(),
      });
      if (result.success) {
        setAddingSubitemFor(null);
        setNewSubitemName("");
        setExpandedItems((current) => new Set(current).add(parentItemId));
        router.refresh();
      }
    });
  }

  function handleSubitemStatusChange(subitemId: string, label: string) {
    const columnId =
      board.columnMap.subitemStatusColumnId ?? board.columnMap.statusColumnId;
    if (!columnId) {
      return;
    }
    handleUpdateStatus(subitemId, columnId, label);
  }

  return (
    <div className="space-y-4">
      <TaskHubMondayToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortMode={sortMode}
        onSortChange={setSortMode}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        statusOptions={statusOptions}
        personFilter={personFilter}
        onPersonFilterChange={setPersonFilter}
        orgMembers={orgMembers}
        itemCount={totalItems}
        filteredCount={filteredItems}
        canEdit={canEdit}
        onNewEvent={() => {
          const firstGroup = board.groups[0];
          if (firstGroup) {
            setShowNewEventForGroup(firstGroup.id);
          }
        }}
        hiddenColumns={hiddenColumns}
        onToggleColumn={(columnId) => {
          setHiddenColumns((current) => {
            const next = new Set(current);
            if (next.has(columnId)) {
              next.delete(columnId);
            } else {
              next.add(columnId);
            }
            return next;
          });
        }}
        visibleColumnIds={columns.map((column) => ({
          id: column.id,
          label: column.label,
        }))}
      />

      {filteredGroups.length === 0 ? (
        <div className="cos-card py-12 text-center text-sm text-cos-muted">
          No events match your search or filters.
        </div>
      ) : (
        filteredGroups.map((group) => {
          const collapsed = collapsedGroups.has(group.id);
          const prioritySummary = countGroupPriorityDistribution(group.items);
          const statusSummary = countGroupStatusDistribution(group.items);
          const accent = groupAccentColor(group.color);

          return (
            <section key={group.id} className="cos-card overflow-hidden p-0">
              <div
                className="flex items-center gap-3 border-b border-cos-border bg-gradient-to-r from-cos-bg to-cos-card px-4 py-3"
                style={{ borderLeftWidth: 4, borderLeftColor: accent }}
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="inline-flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  aria-expanded={!collapsed}
                >
                  {collapsed ? (
                    <ChevronRight className="h-4 w-4 shrink-0 text-cos-muted" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-cos-muted" />
                  )}
                  <span className="truncate font-display text-lg text-cos-text">
                    {group.title}
                  </span>
                  <span className="rounded-full bg-cos-bg-alt px-2 py-0.5 text-[10px] font-medium text-cos-muted tabular-nums">
                    {group.items.length}
                  </span>
                </button>
              </div>

              {!collapsed && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[56rem] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-cos-border bg-cos-bg/60 text-left text-[11px] font-semibold tracking-wide text-cos-muted uppercase">
                        <th className="w-10 px-2 py-2" />
                        <th className="min-w-[14rem] px-3 py-2">Event</th>
                        {columns.map((column) => (
                          <th key={column.id} className="px-3 py-2 whitespace-nowrap">
                            {column.label}
                          </th>
                        ))}
                        <th className="w-10 px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item) => {
                        const expanded = expandedItems.has(item.id);
                        const isPending = pendingItemIds.has(item.id);

                        return (
                          <Fragment key={item.id}>
                            <tr
                              className={cn(
                                "border-b border-cos-border/70 hover:bg-cos-bg/40",
                                isPending && "opacity-60",
                              )}
                            >
                              <td className="px-2 py-2">
                                <button
                                  type="button"
                                  onClick={() => toggleItem(item.id)}
                                  className="rounded p-1 text-cos-muted hover:bg-cos-bg-alt hover:text-cos-text"
                                  aria-expanded={expanded}
                                  aria-label={expanded ? "Collapse subitems" : "Expand subitems"}
                                >
                                  {expanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </button>
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex min-w-0 items-center gap-2">
                                  <span className="truncate font-medium text-cos-text">
                                    {item.name}
                                  </span>
                                  {item.eventHref && (
                                    <Link
                                      href={item.eventHref}
                                      className="shrink-0 text-cos-accent hover:text-cos-text"
                                      title="Open in CampaignOS"
                                    >
                                      ↗
                                    </Link>
                                  )}
                                  {item.mondayItemUrl && (
                                    <a
                                      href={item.mondayItemUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="shrink-0 text-cos-muted hover:text-cos-text"
                                      title="Open in Monday"
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                  )}
                                </div>
                                {item.subitems.length > 0 && !expanded && (
                                  <p className="mt-0.5 text-[10px] text-cos-muted">
                                    {item.subitems.length} subitem
                                    {item.subitems.length === 1 ? "" : "s"}
                                  </p>
                                )}
                              </td>
                              {columns.map((column) => (
                                <td key={column.id} className="px-3 py-2 align-middle">
                                  {column.render(item)}
                                </td>
                              ))}
                              <td className="px-2 py-2" />
                            </tr>

                            {expanded && (
                              <tr key={`${item.id}-subitems`} className="bg-cos-bg/30">
                                <td colSpan={columns.length + 3} className="px-3 py-2">
                                  <div className="ml-8 overflow-x-auto rounded-md border border-cos-border bg-cos-card">
                                    <table className="w-full min-w-[32rem] text-xs">
                                      <thead>
                                        <tr className="border-b border-cos-border text-left text-[10px] font-semibold tracking-wide text-cos-muted uppercase">
                                          <th className="px-3 py-2">Subitem</th>
                                          <th className="px-3 py-2">Owner</th>
                                          <th className="px-3 py-2">Status</th>
                                          <th className="px-3 py-2">Date</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {item.subitems.map((subitem) => (
                                          <tr
                                            key={subitem.id}
                                            className="border-b border-cos-border/60 last:border-0"
                                          >
                                            <td className="px-3 py-2 font-medium text-cos-text">
                                              {subitem.name}
                                            </td>
                                            <td className="px-3 py-2">
                                              <MondayPeopleAvatars
                                                people={subitem.columnValues.owner}
                                                max={2}
                                              />
                                            </td>
                                            <td className="px-3 py-2">
                                              <MondayLabelPill
                                                label={subitem.columnValues.status}
                                                options={SUBITEM_STATUS_OPTIONS}
                                                disabled={!canEdit || pending}
                                                onChange={
                                                  canEdit
                                                    ? (label) =>
                                                        handleSubitemStatusChange(
                                                          subitem.id,
                                                          label,
                                                        )
                                                    : undefined
                                                }
                                              />
                                            </td>
                                            <td className="px-3 py-2 text-cos-muted">
                                              {subitem.columnValues.date ?? "—"}
                                            </td>
                                          </tr>
                                        ))}
                                        {canEdit && (
                                          <tr>
                                            <td colSpan={4} className="px-3 py-2">
                                              {addingSubitemFor === item.id ? (
                                                <div className="flex flex-wrap items-center gap-2">
                                                  <input
                                                    value={newSubitemName}
                                                    onChange={(event) =>
                                                      setNewSubitemName(event.target.value)
                                                    }
                                                    placeholder="Subitem name…"
                                                    className="min-w-[12rem] flex-1 rounded-md border border-cos-border bg-cos-bg px-2 py-1.5 text-xs"
                                                  />
                                                  <button
                                                    type="button"
                                                    disabled={pending}
                                                    onClick={() => handleCreateSubitem(item.id)}
                                                    className="rounded-md bg-cos-dark px-2.5 py-1.5 text-xs font-medium text-[#f6f2eb]"
                                                  >
                                                    Add
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setAddingSubitemFor(null);
                                                      setNewSubitemName("");
                                                    }}
                                                    className="text-xs text-cos-muted"
                                                  >
                                                    Cancel
                                                  </button>
                                                </div>
                                              ) : (
                                                <button
                                                  type="button"
                                                  onClick={() => setAddingSubitemFor(item.id)}
                                                  className="inline-flex items-center gap-1 text-xs font-medium text-cos-accent hover:text-cos-text"
                                                >
                                                  <Plus className="h-3.5 w-3.5" />
                                                  Add subitem
                                                </button>
                                              )}
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}

                      {canEdit && showNewEventForGroup === group.id && (
                        <tr className="bg-cos-bg/40">
                          <td colSpan={columns.length + 3} className="px-4 py-3">
                            <div className="flex flex-wrap items-end gap-2">
                              <label className="space-y-1 text-xs">
                                <span className="text-cos-muted">Event name</span>
                                <input
                                  value={newEventName}
                                  onChange={(event) => setNewEventName(event.target.value)}
                                  className="block min-w-[12rem] rounded-md border border-cos-border bg-cos-card px-2 py-1.5"
                                />
                              </label>
                              <label className="space-y-1 text-xs">
                                <span className="text-cos-muted">Link to CampaignOS event</span>
                                <select
                                  value={newEventLinkId}
                                  onChange={(event) => setNewEventLinkId(event.target.value)}
                                  className="block min-w-[14rem] rounded-md border border-cos-border bg-cos-card px-2 py-1.5"
                                >
                                  <option value="">Optional…</option>
                                  {events.map((event) => (
                                    <option key={event.eventId} value={event.eventId}>
                                      {event.eventTitle}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <button
                                type="button"
                                disabled={pending || !newEventName.trim()}
                                onClick={() => handleCreateEvent(group.id)}
                                className="rounded-md bg-cos-dark px-3 py-1.5 text-xs font-medium text-[#f6f2eb]"
                              >
                                Create event
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowNewEventForGroup(null);
                                  setNewEventName("");
                                  setNewEventLinkId("");
                                }}
                                className="text-xs text-cos-muted"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}

                      {canEdit && showNewEventForGroup !== group.id && (
                        <tr>
                          <td colSpan={columns.length + 3} className="px-4 py-2">
                            <button
                              type="button"
                              onClick={() => setShowNewEventForGroup(group.id)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-cos-accent hover:text-cos-text"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              New event in {group.title}
                            </button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-cos-border bg-cos-bg/50">
                        <td colSpan={columns.length + 3} className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-4">
                            <div className="flex min-w-[8rem] flex-1 items-center gap-2">
                              <span className="text-[10px] font-semibold tracking-wide text-cos-muted uppercase">
                                Priority
                              </span>
                              <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-cos-bg-alt">
                                {prioritySummary.map((entry) => (
                                  <div
                                    key={entry.label}
                                    className="h-full bg-cos-accent"
                                    style={{
                                      width: `${(entry.count / group.items.length) * 100}%`,
                                    }}
                                    title={`${entry.label}: ${entry.count}`}
                                  />
                                ))}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {statusSummary.map((entry) => (
                                <span
                                  key={entry.label}
                                  className="rounded-full bg-cos-bg-alt px-2 py-0.5 text-[10px] text-cos-muted"
                                >
                                  {entry.label}: {entry.count}
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
