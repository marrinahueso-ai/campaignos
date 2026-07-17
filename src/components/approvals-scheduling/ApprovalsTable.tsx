"use client";

import Image from "next/image";
import { Loader2, MoreHorizontal } from "lucide-react";
import { useState } from "react";
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
import type { UnifiedApprovalItem } from "@/lib/approvals-scheduling/types";
import { hasStaleContentNote } from "@/lib/dev-tools/clear-generated-content";
import { cn } from "@/lib/utils/cn";

interface ApprovalsTableProps {
  items: UnifiedApprovalItem[];
  canApproveComms: boolean;
  actorEmail: string | null;
  onReview: (item: UnifiedApprovalItem) => void;
  onActionError: (message: string) => void;
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
          Try another tab, filter, or search term.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-cos-border bg-cos-card">
      <table className="min-w-[1080px] w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-cos-border bg-cos-bg/60">
            {[
              "Campaign / Milestone",
              "Status",
              "Assigned To",
              "Next Action",
              "Delivery",
              "Schedule",
              "Actions",
            ].map((heading) => (
              <th
                key={heading}
                className="px-4 py-3 text-[10px] font-semibold tracking-[0.14em] text-cos-muted uppercase"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
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

export function ApprovalTabs({
  activeTab,
  counts,
  onChange,
}: {
  activeTab: string;
  counts: Record<string, number>;
  onChange: (tab: string) => void;
}) {
  const tabs = [
    { id: "all", label: "All" },
    { id: "in_queue", label: "In Queue", count: counts.in_queue },
    { id: "assigned_to_me", label: "Assigned to Me", count: counts.assigned_to_me },
    { id: "scheduled", label: "Scheduled", count: counts.scheduled },
    { id: "posted", label: "Posted", count: counts.posted },
    { id: "published", label: "Published", count: counts.published },
    {
      id: "changes_requested",
      label: "Changes Requested",
      count: counts.changes_requested,
    },
  ];

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-cos-border">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "shrink-0 px-4 py-3 text-sm font-medium transition-colors",
            activeTab === tab.id
              ? "border-b-2 border-cos-dark text-cos-text"
              : "text-cos-muted hover:text-cos-text",
          )}
        >
          {tab.label}
          {tab.count !== undefined ? ` (${tab.count})` : ""}
        </button>
      ))}
    </div>
  );
}
