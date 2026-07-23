"use client";

import type {
  UnifiedApprovalSummaryCounts,
  UnifiedTabId,
} from "@/lib/approvals-scheduling/types";
import { cn } from "@/lib/utils/cn";

interface SummaryCardsProps {
  summary: UnifiedApprovalSummaryCounts;
  activeFilter: UnifiedTabId;
  onFilterChange: (filter: UnifiedTabId) => void;
}

const CARDS: {
  key: keyof UnifiedApprovalSummaryCounts;
  tabId: Exclude<UnifiedTabId, "all">;
  label: string;
  description: string;
}[] = [
  {
    key: "assignedToMe",
    tabId: "assigned_to_me",
    label: "Assigned to Me",
    description: "Needs your approval",
  },
  {
    key: "changesRequested",
    tabId: "changes_requested",
    label: "Changes Requested",
    description: "Returned for edits",
  },
  {
    key: "inQueue",
    tabId: "in_queue",
    label: "In Queue",
    description: "Waiting to be assigned",
  },
  {
    key: "scheduled",
    tabId: "scheduled",
    label: "Scheduled",
    description: "Scheduled to publish",
  },
  {
    key: "posted",
    tabId: "posted",
    label: "Posted",
    description: "Waiting to publish",
  },
  {
    key: "published",
    tabId: "published",
    label: "Published",
    description: "Live and published",
  },
];

export function SummaryCards({
  summary,
  activeFilter,
  onFilterChange,
}: SummaryCardsProps) {
  function handleCardClick(tabId: Exclude<UnifiedTabId, "all">) {
    onFilterChange(activeFilter === tabId ? "all" : tabId);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {CARDS.map((card) => {
        const isActive = activeFilter === card.tabId;

        return (
          <button
            key={card.key}
            type="button"
            onClick={() => handleCardClick(card.tabId)}
            aria-pressed={isActive}
            className={cn(
              "flex min-h-[6rem] flex-col items-center justify-center gap-1.5 rounded-2xl px-4 py-5 text-center transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cos-accent focus-visible:ring-offset-2 focus-visible:ring-offset-cos-bg",
              isActive
                ? "bg-cos-dark text-white shadow-[0_12px_28px_rgba(42,38,34,0.22)] ring-1 ring-cos-dark"
                : "bg-cos-bg-alt text-cos-text shadow-[0_1px_0_rgba(255,252,247,0.9)_inset,0_2px_4px_rgba(42,38,34,0.06),0_10px_22px_rgba(42,38,34,0.08)] ring-1 ring-black/[0.04] hover:ring-cos-accent/40",
            )}
          >
            <span
              className={cn(
                "text-xs font-medium tracking-wide uppercase",
                isActive ? "text-white/70" : "text-cos-muted",
              )}
            >
              {card.label}
            </span>
            <span
              className={cn(
                "font-display text-3xl leading-none tabular-nums",
                isActive ? "text-white" : "text-cos-text",
              )}
            >
              {summary[card.key]}
            </span>
            <span
              className={cn(
                "text-xs",
                isActive ? "text-white/70" : "text-cos-muted",
              )}
            >
              {card.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
