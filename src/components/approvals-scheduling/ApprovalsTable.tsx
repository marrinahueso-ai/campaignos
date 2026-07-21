"use client";

import Image from "next/image";
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, MoreHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import {
  AssigneeAvatar,
  DeliveryIcons,
} from "@/components/approvals-scheduling/ReviewDrawer";
import { StatusBadge } from "@/components/approvals-scheduling/StatusBadge";
import { useEventTabMutationRefresh } from "@/components/events-phase3/EventDetailTabInvalidation";
import { Button } from "@/components/ui/Button";
import {
  approveUnifiedItemAction,
} from "@/lib/approvals-scheduling/actions";
import { canActOnUnifiedItem } from "@/lib/approvals-scheduling/permissions";
import {
  DEFAULT_APPROVAL_SORT_DIRECTION,
  DEFAULT_APPROVAL_SORT_FIELD,
  nextApprovalSortState,
  sortApprovalItems,
} from "@/lib/approvals-scheduling/status";
import type {
  ApprovalSortDirection,
  ApprovalSortField,
  UnifiedApprovalItem,
} from "@/lib/approvals-scheduling/types";
import { hasStaleContentNote } from "@/lib/dev-tools/clear-generated-content";
import { cn } from "@/lib/utils/cn";

const SORTABLE_COLUMNS: {
  key: ApprovalSortField;
  label: string;
}[] = [
  { key: "campaign", label: "Campaign / Milestone" },
  { key: "status", label: "Status" },
  { key: "assignee", label: "Assigned To" },
  { key: "nextAction", label: "Next Action" },
  { key: "delivery", label: "Delivery" },
  { key: "schedule", label: "Schedule" },
];

interface ApprovalsTableProps {
  items: UnifiedApprovalItem[];
  canApproveComms: boolean;
  actorEmail: string | null;
  onReview: (item: UnifiedApprovalItem) => void;
  onActionError: (message: string) => void;
}

function SortIcon({
  field,
  sortField,
  sortDirection,
}: {
  field: ApprovalSortField;
  sortField: ApprovalSortField;
  sortDirection: ApprovalSortDirection;
}) {
  if (sortField !== field) {
    return <ArrowUpDown className="h-3 w-3 opacity-40" strokeWidth={1.5} />;
  }

  return sortDirection === "asc" ? (
    <ArrowUp className="h-3 w-3" strokeWidth={1.5} />
  ) : (
    <ArrowDown className="h-3 w-3" strokeWidth={1.5} />
  );
}

export function ApprovalsTable({
  items,
  canApproveComms,
  actorEmail,
  onReview,
  onActionError,
}: ApprovalsTableProps) {
  const refreshApprovalsTab = useEventTabMutationRefresh("approvals");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [expandedActionsId, setExpandedActionsId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<ApprovalSortField>(
    DEFAULT_APPROVAL_SORT_FIELD,
  );
  const [sortDirection, setSortDirection] = useState<ApprovalSortDirection>(
    DEFAULT_APPROVAL_SORT_DIRECTION,
  );

  const sortedItems = useMemo(
    () => sortApprovalItems(items, sortField, sortDirection),
    [items, sortField, sortDirection],
  );

  function handleSort(field: ApprovalSortField) {
    const next = nextApprovalSortState(sortField, sortDirection, field);
    setSortField(next.field);
    setSortDirection(next.direction);
  }

  async function runAction(
    item: UnifiedApprovalItem,
    action: () => Promise<{ success: boolean; error?: string; warning?: string }>,
  ) {
    setPendingId(item.id);
    try {
      const result = await action();
      if (result.success) {
        if (result.warning) {
          onActionError(result.warning);
        }
        await refreshApprovalsTab();
        return;
      }
      onActionError(result.error ?? "Unable to complete that action.");
    } catch {
      onActionError("Something went wrong. Please try again.");
    } finally {
      setPendingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="border border-cos-border bg-cos-card px-6 py-16 text-center">
        <p className="font-display text-2xl text-cos-text">No approvals found</p>
        <p className="mt-2 text-sm text-cos-muted">
          Nothing to show in this view yet.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-cos-border bg-cos-card">
      <table className="min-w-[1080px] w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-cos-border bg-cos-bg/60">
            {SORTABLE_COLUMNS.map((column) => (
              <th
                key={column.key}
                className="px-4 py-3 text-[10px] font-semibold tracking-[0.14em] text-cos-muted uppercase"
                aria-sort={
                  sortField === column.key
                    ? sortDirection === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <button
                  type="button"
                  onClick={() => handleSort(column.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 transition-colors hover:text-cos-text",
                    sortField === column.key && "text-cos-text",
                  )}
                >
                  {column.label}
                  <SortIcon
                    field={column.key}
                    sortField={sortField}
                    sortDirection={sortDirection}
                  />
                </button>
              </th>
            ))}
            <th className="px-4 py-3 text-[10px] font-semibold tracking-[0.14em] text-cos-muted uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.map((item) => {
            const canAct = canActOnUnifiedItem(item, canApproveComms);
            const isPending = pendingId === item.id;
            const showReview =
              item.workflowStatus === "assigned_to_me" ||
              item.workflowStatus === "in_queue" ||
              item.workflowStatus === "changes_requested";

            return (
              <tr key={item.id} className="border-b border-cos-border last:border-b-0">
                <td className="px-4 py-4 align-top">
                  <div className="flex items-start gap-3">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden border border-cos-border bg-cos-bg">
                      {item.thumbnailUrl ? (
                        <Image
                          src={item.thumbnailUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="48px"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-cos-muted">
                          Art
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-cos-text">
                        {item.campaignName}
                      </p>
                      <p className="text-sm text-cos-text">{item.milestoneName}</p>
                      <p className="text-xs text-cos-muted">Campaign</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 align-top">
                  <StatusBadge
                    status={item.workflowStatus}
                    detail={item.statusDetail}
                    needsRegeneration={hasStaleContentNote(item.notes)}
                  />
                </td>
                <td className="px-4 py-4 align-top">
                  <AssigneeAvatar
                    initials={item.assigneeInitials}
                    name={item.assigneeName}
                    role={item.assigneeRole}
                  />
                </td>
                <td className="px-4 py-4 align-top">
                  <p className="text-sm text-cos-text">{item.nextAction}</p>
                  <p className="text-xs text-cos-muted">{item.nextActionTime}</p>
                </td>
                <td className="px-4 py-4 align-top">
                  <DeliveryIcons
                    platforms={item.platforms}
                    deliveryMethod={item.deliveryMethod}
                  />
                </td>
                <td className="px-4 py-4 align-top">
                  <p className="text-sm text-cos-text">
                    {item.scheduleLabel ?? "—"}
                  </p>
                </td>
                <td className="px-4 py-4 align-top">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={showReview && canAct ? "primary" : "secondary"}
                      disabled={isPending}
                      onClick={() => onReview(item)}
                    >
                      View
                    </Button>
                    {canAct && showReview ? (
                      <div className="relative">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          aria-label="More actions"
                          onClick={() =>
                            setExpandedActionsId((current) =>
                              current === item.id ? null : item.id,
                            )
                          }
                        >
                          {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                        </Button>
                        {expandedActionsId === item.id ? (
                          <div className="absolute right-0 z-10 mt-1 min-w-40 border border-cos-border bg-cos-card py-1 shadow-lg">
                            <button
                              type="button"
                              className="block w-full px-3 py-2 text-left text-sm text-cos-text hover:bg-cos-bg"
                              onClick={() => {
                                setExpandedActionsId(null);
                                void runAction(item, () =>
                                  approveUnifiedItemAction({
                                    eventId: item.eventId,
                                    communicationItemId: item.communicationItemId,
                                    schedulingItemId: item.schedulingItemId,
                                    campaignName: item.campaignName,
                                    milestoneName: item.milestoneName,
                                    recipientEmail: actorEmail,
                                  }),
                                );
                              }}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="block w-full px-3 py-2 text-left text-sm text-cos-text hover:bg-cos-bg"
                              onClick={() => {
                                setExpandedActionsId(null);
                                onReview(item);
                              }}
                            >
                              Request changes
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
