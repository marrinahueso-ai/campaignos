"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Circle, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { PLAN_STATUS_LABELS } from "@/lib/creative-director/constants";
import {
  approveAssetCreativeAction,
  ensurePlannerAssetAction,
  regenerateAssetPromptAction,
  runAssetReviewAction,
  updateAssetPlanStatusAction,
  updateAssetPromptAction,
} from "@/lib/creative-director/actions";
import { planStatusProgressIcon } from "@/lib/creative-director/plan-status";
import type { AssetPlanItem, CreativePlanStatus } from "@/lib/creative-director/types";
import { cn } from "@/lib/utils/cn";

interface AssetPlannerPanelProps {
  eventId: string;
  plan: AssetPlanItem[];
  canEdit: boolean;
  onUpdated?: () => void;
}

const STATUS_OPTIONS: CreativePlanStatus[] = [
  "needed",
  "in_progress",
  "generated",
  "approved",
  "published",
];

function StatusIcon({ status }: { status: CreativePlanStatus }) {
  const kind = planStatusProgressIcon(status);
  if (kind === "done") {
    return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
  }
  if (kind === "active") {
    return <Loader2 className="h-5 w-5 animate-spin text-cos-primary" />;
  }
  return <Circle className="h-5 w-5 text-cos-muted" />;
}

function PlannerRow({
  eventId,
  item,
  canEdit,
  onUpdated,
}: {
  eventId: string;
  item: AssetPlanItem;
  canEdit: boolean;
  onUpdated?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [prompt, setPrompt] = useState(item.generationPrompt ?? "");
  const [expanded, setExpanded] = useState(false);

  function ensureAsset(callback: (assetId: string) => void) {
    if (item.assetId) {
      callback(item.assetId);
      return;
    }
    startTransition(async () => {
      const result = await ensurePlannerAssetAction(eventId, item.assetType, item.label);
      if (result.success && result.assetId) {
        callback(result.assetId);
        onUpdated?.();
      }
    });
  }

  return (
    <article className="rounded-2xl border border-cos-border bg-cos-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <StatusIcon status={item.planStatus} />
          <div>
            <h3 className="text-sm font-semibold text-cos-text">{item.label}</h3>
            <p className="mt-0.5 text-xs text-cos-muted">
              {PLAN_STATUS_LABELS[item.planStatus]}
              {item.optional ? " · Optional" : ""}
            </p>
            {item.inspirationMatch && (
              <p className="mt-2 text-xs text-cos-primary">{item.inspirationMatch.message}</p>
            )}
          </div>
        </div>
        <Badge variant={item.hasUpload ? "success" : "warning"}>
          {item.hasUpload ? "Uploaded" : "Needed"}
        </Badge>
      </div>

      {canEdit && (
        <div className="mt-4 flex flex-wrap gap-2">
          <select
            value={item.planStatus}
            disabled={isPending}
            onChange={(e) => {
              const status = e.target.value as CreativePlanStatus;
              ensureAsset((assetId) => {
                startTransition(async () => {
                  await updateAssetPlanStatusAction(eventId, assetId, status);
                  onUpdated?.();
                });
              });
            }}
            className="h-9 rounded-lg border border-cos-border bg-cos-bg px-2 text-xs text-cos-text"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {PLAN_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => setExpanded((open) => !open)}
          >
            {expanded ? "Hide prompt" : "Edit prompt"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() =>
              ensureAsset((assetId) => {
                startTransition(async () => {
                  await regenerateAssetPromptAction(
                    eventId,
                    assetId,
                    item.label,
                    item.assetType,
                  );
                  onUpdated?.();
                });
              })
            }
          >
            <Sparkles className="h-4 w-4" />
            Regenerate prompt
          </Button>
          {item.hasUpload && (
            <>
              <Button
                size="sm"
                variant="ghost"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await runAssetReviewAction(eventId, item.assetId!);
                    onUpdated?.();
                  })
                }
              >
                AI review
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await approveAssetCreativeAction(eventId, item.assetId!);
                    onUpdated?.();
                  })
                }
              >
                Approve artwork
              </Button>
            </>
          )}
        </div>
      )}

      {expanded && (
        <div className="mt-4 space-y-2">
          <label className="text-xs font-medium text-cos-muted">Generation prompt</label>
          <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={8} />
          {canEdit && (
            <Button
              size="sm"
              disabled={isPending}
              onClick={() =>
                ensureAsset((assetId) => {
                  startTransition(async () => {
                    await updateAssetPromptAction(eventId, assetId, prompt);
                    onUpdated?.();
                  });
                })
              }
            >
              Save prompt
            </Button>
          )}
          <p className="text-xs text-cos-muted">
            Open the Artwork tab to generate concepts from this prompt with OpenAI.
          </p>
        </div>
      )}

      {item.aiReview && (
        <div
          className={cn(
            "mt-4 rounded-xl px-4 py-3 text-sm",
            item.aiReview.verdict === "looks_good"
              ? "bg-emerald-50 text-emerald-900"
              : "bg-amber-50 text-amber-950",
          )}
        >
          <p className="font-medium">
            {item.aiReview.verdict === "looks_good" ? "Looks good" : "Suggestions"}
          </p>
          {item.aiReview.suggestions.length > 0 && (
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
              {item.aiReview.suggestions.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}

export function AssetPlannerPanel({
  eventId,
  plan,
  canEdit,
  onUpdated,
}: AssetPlannerPanelProps) {
  if (plan.length === 0) {
    return (
      <p className="text-sm text-cos-muted">
        No visual assets planned yet. Generate a creative brief to build the asset plan.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-cos-text">Asset Planner</h2>
        <p className="mt-1 text-sm text-cos-muted">
          Every visual asset this campaign needs — with editable prompts for future generation.
        </p>
      </div>
      <div className="space-y-3">
        {plan.map((item) => (
          <PlannerRow
            key={`${item.label}-${item.assetType}`}
            eventId={eventId}
            item={item}
            canEdit={canEdit}
            onUpdated={onUpdated}
          />
        ))}
      </div>
    </div>
  );
}
