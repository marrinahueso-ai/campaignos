"use client";

import {
  Calendar,
  CheckCircle2,
  Clock3,
  FileEdit,
  Layers,
  Megaphone,
} from "lucide-react";
import {
  CAMPAIGN_SUMMARY_CARDS,
  type CampaignSummaryFilter,
} from "@/lib/events/campaign-page-filters";
import { cn } from "@/lib/utils/cn";

const SUMMARY_ICONS: Record<CampaignSummaryFilter, typeof Megaphone> = {
  all: Layers,
  upcoming: Calendar,
  scheduled: Clock3,
  drafts: FileEdit,
  reminders_only: Megaphone,
  completed: CheckCircle2,
};

interface CampaignSummaryCardsProps {
  counts: Record<CampaignSummaryFilter, number>;
  activeFilter: CampaignSummaryFilter;
  onFilterChange: (filter: CampaignSummaryFilter) => void;
}

export function CampaignSummaryCards({
  counts,
  activeFilter,
  onFilterChange,
}: CampaignSummaryCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {CAMPAIGN_SUMMARY_CARDS.map((card) => {
        const Icon = SUMMARY_ICONS[card.key];
        const isActive = activeFilter === card.key;

        return (
          <button
            key={card.key}
            type="button"
            onClick={() => onFilterChange(card.key)}
            className={cn(
              "flex flex-col gap-3 border bg-cos-card p-4 text-left transition-colors",
              isActive
                ? "border-cos-dark bg-cos-bg-alt"
                : "border-cos-border hover:border-cos-accent/50 hover:bg-cos-bg/40",
            )}
            aria-pressed={isActive}
          >
            <span
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-md",
                card.iconColor,
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.5} />
            </span>
            <span>
              <span className="block text-xs font-medium text-cos-muted">
                {card.label}
              </span>
              <span className="mt-1 block font-display text-3xl leading-none text-cos-text">
                {counts[card.key]}
              </span>
              <span className="mt-1 block text-[11px] text-cos-muted">
                {card.subtitle}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
