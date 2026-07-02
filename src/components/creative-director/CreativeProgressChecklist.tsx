"use client";

import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { planStatusDisplayLabel, planStatusProgressIcon } from "@/lib/creative-director/plan-status";
import { ARTWORK_REBUILD_INLINE_MESSAGE } from "@/lib/creative-studio/artwork-section-disabled";
import type { AssetPlanItem, CreativePlanStatus } from "@/lib/creative-director/types";
import { cn } from "@/lib/utils/cn";

interface CreativeProgressChecklistProps {
  eventId: string;
  plan: AssetPlanItem[];
}

function ProgressIcon({ status }: { status: CreativePlanStatus }) {
  const kind = planStatusProgressIcon(status);
  if (kind === "done") {
    return <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />;
  }
  if (kind === "active") {
    return <Loader2 className="h-5 w-5 shrink-0 animate-spin text-cos-primary" />;
  }
  return <Circle className="h-5 w-5 shrink-0 text-cos-muted/60" />;
}

export function CreativeProgressChecklist({
  plan,
}: CreativeProgressChecklistProps) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Artwork progress</CardTitle>
          <CardDescription>
            Visual assets for this campaign — planned, in progress, and complete.{" "}
            {ARTWORK_REBUILD_INLINE_MESSAGE}
          </CardDescription>
        </div>
      </CardHeader>

      <div className="px-6 pb-6">
        {plan.length === 0 ? (
          <p className="text-sm text-cos-muted">
            Plan artwork for this campaign to track progress here.
          </p>
        ) : (
          <ul className="divide-y divide-cos-border rounded-2xl border border-cos-border bg-cos-card">
            {plan.map((item) => (
              <li
                key={`${item.label}-${item.assetType}`}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <ProgressIcon status={item.planStatus} />
                  <span className="truncate text-sm font-medium text-cos-text">
                    {item.label}
                  </span>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-xs",
                    item.planStatus === "approved" || item.planStatus === "published"
                      ? "text-emerald-700"
                      : item.planStatus === "generated" || item.planStatus === "in_progress"
                        ? "text-cos-primary"
                        : "text-cos-muted",
                  )}
                >
                  {planStatusDisplayLabel(item.planStatus)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
