"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import type { AiCreditLedgerEntry } from "@/lib/ai/credit-ledger";
import { ledgerActivityDescription } from "@/lib/ai/usage-breakdown-pure";
import { cn } from "@/lib/utils/cn";
import { formatDateTime } from "@/lib/utils/dates";

const VISIBLE_COUNT = 8;

const LEDGER_ENTRY_LABELS: Record<string, string> = {
  period_grant: "Period grant",
  burn: "Usage",
  reserve_grant: "Reserve added",
  bonus_grant: "Bonus",
  adjustment: "Adjustment",
};

function ledgerEntryLabel(entryType: string): string {
  return LEDGER_ENTRY_LABELS[entryType] ?? entryType;
}

function ledgerBadgeVariant(entryType: string): "success" | "default" | "info" {
  if (
    entryType === "period_grant" ||
    entryType === "reserve_grant" ||
    entryType === "bonus_grant"
  ) {
    return "success";
  }
  if (entryType === "adjustment") return "info";
  return "default";
}

function formatSignedAmount(amount: number): string {
  if (amount > 0) return `+${amount.toLocaleString()}`;
  return amount.toLocaleString();
}

export function RecentActivityList({
  ledger,
}: {
  ledger: AiCreditLedgerEntry[];
}) {
  const [expanded, setExpanded] = useState(false);

  if (ledger.length === 0) {
    return <p className="text-sm text-cos-muted">No activity yet.</p>;
  }

  const visible = expanded ? ledger : ledger.slice(0, VISIBLE_COUNT);
  const hasMore = ledger.length > VISIBLE_COUNT;

  return (
    <>
      <ul className="divide-y divide-cos-border">
        {visible.map((entry) => (
          <li
            key={entry.id}
            className="flex items-center gap-x-3 gap-y-0 py-3 text-sm first:pt-0 last:pb-0"
          >
            <Badge variant={ledgerBadgeVariant(entry.entryType)} className="shrink-0">
              {ledgerEntryLabel(entry.entryType)}
            </Badge>
            <p className="shrink-0 text-xs text-cos-muted">
              {formatDateTime(entry.createdAt)}
            </p>
            <p className="min-w-0 flex-1 truncate text-cos-muted">
              {ledgerActivityDescription(entry)}
            </p>
            <p
              className={cn(
                "shrink-0 text-sm font-medium tabular-nums",
                entry.amount < 0
                  ? "text-cos-error-text"
                  : entry.amount > 0
                    ? "text-cos-success-text"
                    : "text-cos-muted",
              )}
            >
              {formatSignedAmount(entry.amount)}
            </p>
          </li>
        ))}
      </ul>
      {hasMore ? (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className="mt-3 text-sm font-medium text-cos-accent underline-offset-2 hover:underline"
        >
          {expanded ? "Show less" : `Show more (${ledger.length - VISIBLE_COUNT})`}
        </button>
      ) : null}
    </>
  );
}
