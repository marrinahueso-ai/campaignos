"use client";

import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  mapPlanStatusToWorkflowStatus,
  resolveWorkflowAsset,
  resolveWorkflowPlanItem,
  synthesizePlanItem,
  workflowPrimaryActionLabel,
  workflowStatusLabel,
  type ArtworkWorkflowItem,
  type ArtworkWorkflowStatus,
} from "@/lib/creative-studio/artwork-workflow";
import type { AssetPlanItem } from "@/lib/creative-director/types";
import type { EventAsset } from "@/types/event-workspace";
import { cn } from "@/lib/utils/cn";

interface ArtworkChecklistProps {
  eventTitle: string;
  plan: AssetPlanItem[];
  assets: EventAsset[];
  workflowItems: ArtworkWorkflowItem[];
  onSelectItem: (item: ArtworkWorkflowItem) => void;
  isEnsuring?: boolean;
}

function StatusIcon({ status }: { status: ArtworkWorkflowStatus }) {
  if (status === "approved") {
    return <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />;
  }
  if (status === "ready" || status === "needs_changes") {
    return <Loader2 className="h-5 w-5 shrink-0 text-cos-primary" />;
  }
  return <Circle className="h-5 w-5 shrink-0 text-cos-muted/60" />;
}

export function ArtworkChecklist({
  eventTitle,
  plan,
  assets,
  workflowItems,
  onSelectItem,
  isEnsuring = false,
}: ArtworkChecklistProps) {
  const coreItems = workflowItems.filter(
    (item) =>
      item.id === "facebook-feed" ||
      item.id === "facebook-story" ||
      item.id === "instagram-feed" ||
      item.id === "instagram-story" ||
      item.id === "flyer",
  );
  const extraItems = workflowItems.filter((item) => !coreItems.includes(item));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-cos-muted">
          Artwork for this event
        </p>
        <h2 className="mt-1 text-lg font-semibold text-cos-text">{eventTitle}</h2>
        <p className="mt-2 text-sm text-cos-muted">
          Start with the four core social graphics. Generate each one, pick a concept, and mark
          complete when ready.
        </p>
      </div>

      {workflowItems.length === 0 ? (
        <p className="rounded-xl border border-cos-border bg-cos-bg/40 px-4 py-3 text-sm text-cos-muted">
          This event is calendar-only — no artwork checklist is required.
        </p>
      ) : (
        <>
          <ChecklistGroup
            items={coreItems}
            plan={plan}
            assets={assets}
            onSelectItem={onSelectItem}
            isEnsuring={isEnsuring}
          />
          {extraItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-cos-muted">
                Also in progress
              </p>
              <ChecklistGroup
                items={extraItems}
                plan={plan}
                assets={assets}
                onSelectItem={onSelectItem}
                isEnsuring={isEnsuring}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ChecklistGroup({
  items,
  plan,
  assets,
  onSelectItem,
  isEnsuring,
}: {
  items: ArtworkWorkflowItem[];
  plan: AssetPlanItem[];
  assets: EventAsset[];
  onSelectItem: (item: ArtworkWorkflowItem) => void;
  isEnsuring: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <ul className="divide-y divide-cos-border rounded-2xl border border-cos-border bg-cos-card">
      {items.map((item) => {
          const planItem = resolveWorkflowPlanItem(item, plan);
          const asset = resolveWorkflowAsset(item, planItem, assets);
          const resolved = planItem ?? synthesizePlanItem(item, asset);
          const workflowStatus = mapPlanStatusToWorkflowStatus(resolved.planStatus);
          const actionLabel = workflowPrimaryActionLabel(workflowStatus);

          return (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <StatusIcon status={workflowStatus} />
                <div>
                  <p className="text-sm font-medium text-cos-text">{item.label}</p>
                  <p
                    className={cn(
                      "text-xs",
                      workflowStatus === "approved"
                        ? "text-emerald-700"
                        : workflowStatus === "ready"
                          ? "text-cos-primary"
                          : "text-cos-muted",
                    )}
                  >
                    {workflowStatusLabel(workflowStatus)}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant={workflowStatus === "not_started" ? "primary" : "secondary"}
                disabled={isEnsuring}
                onClick={() => onSelectItem(item)}
              >
                {actionLabel}
              </Button>
            </li>
          );
        })}
      </ul>
  );
}
