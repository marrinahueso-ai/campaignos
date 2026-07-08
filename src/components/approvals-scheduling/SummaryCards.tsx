import {
  Calendar,
  CheckCircle2,
  Clock3,
  RefreshCcw,
  Send,
  User,
} from "lucide-react";
import type { UnifiedApprovalSummaryCounts } from "@/lib/approvals-scheduling/types";
import { cn } from "@/lib/utils/cn";

interface SummaryCardsProps {
  summary: UnifiedApprovalSummaryCounts;
}

const CARDS = [
  {
    key: "inQueue" as const,
    label: "In Queue",
    description: "Waiting to be assigned",
    icon: Clock3,
    iconClassName: "text-[#8b6f4d]",
  },
  {
    key: "assignedToMe" as const,
    label: "Assigned to Me",
    description: "Needs your approval",
    icon: User,
    iconClassName: "text-[#c47d3a]",
  },
  {
    key: "scheduled" as const,
    label: "Scheduled",
    description: "Scheduled to publish",
    icon: Calendar,
    iconClassName: "text-cos-success",
  },
  {
    key: "posted" as const,
    label: "Posted",
    description: "Waiting to publish",
    icon: Send,
    iconClassName: "text-[#4f7ea8]",
  },
  {
    key: "published" as const,
    label: "Published",
    description: "Live and published",
    icon: CheckCircle2,
    iconClassName: "text-[#3f5240]",
  },
  {
    key: "changesRequested" as const,
    label: "Changes Requested",
    description: "Returned for edits",
    icon: RefreshCcw,
    iconClassName: "text-[#b14f4f]",
  },
];

export function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {CARDS.map((card) => {
        const Icon = card.icon;
        const value = summary[card.key];

        return (
          <div
            key={card.key}
            className="border border-cos-border bg-cos-card px-4 py-4"
          >
            <div className="flex items-start gap-3">
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", card.iconClassName)} strokeWidth={1.5} />
              <div className="min-w-0">
                <p className="text-xs text-cos-muted">{card.label}</p>
                <p className="font-display mt-1 text-3xl text-cos-text">{value}</p>
                <p className="mt-1 text-[11px] leading-snug text-cos-muted">
                  {card.description}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
