import type { UnifiedApprovalSummaryCounts } from "@/lib/approvals-scheduling/types";

interface SummaryCardsProps {
  summary: UnifiedApprovalSummaryCounts;
}

const CARDS = [
  {
    key: "inQueue" as const,
    label: "In Queue",
    description: "Waiting to be assigned",
  },
  {
    key: "assignedToMe" as const,
    label: "Assigned to Me",
    description: "Needs your approval",
  },
  {
    key: "scheduled" as const,
    label: "Scheduled",
    description: "Scheduled to publish",
  },
  {
    key: "posted" as const,
    label: "Posted",
    description: "Waiting to publish",
  },
  {
    key: "published" as const,
    label: "Published",
    description: "Live and published",
  },
  {
    key: "changesRequested" as const,
    label: "Changes Requested",
    description: "Returned for edits",
  },
];

export function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {CARDS.map((card) => (
        <div
          key={card.key}
          className="flex min-h-[6rem] flex-col items-center justify-center gap-1.5 rounded-2xl bg-cos-bg-alt px-4 py-5 text-center shadow-[0_1px_0_rgba(255,252,247,0.9)_inset,0_2px_4px_rgba(42,38,34,0.06),0_10px_22px_rgba(42,38,34,0.08)] ring-1 ring-black/[0.04]"
        >
          <p className="text-xs font-medium tracking-wide text-cos-muted uppercase">
            {card.label}
          </p>
          <p className="font-display text-3xl leading-none text-cos-text tabular-nums">
            {summary[card.key]}
          </p>
          <p className="text-xs text-cos-muted">{card.description}</p>
        </div>
      ))}
    </div>
  );
}
