"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import type { ArtworkV2BatchMilestoneStatus } from "@/lib/artwork-v2/types";
import { cn } from "@/lib/utils/cn";

export interface ArtworkV2BatchMilestoneProgress {
  relativeDay: number;
  title: string;
  status: ArtworkV2BatchMilestoneStatus;
  error?: string;
}

interface ArtworkV2BatchGenerateScreenProps {
  milestones: ArtworkV2BatchMilestoneProgress[];
  currentIndex: number;
  isRunning: boolean;
  isComplete: boolean;
  onCancel: () => void;
  onBackToArtworkList: () => void;
  onReviewMilestones: () => void;
}

function statusLabel(status: ArtworkV2BatchMilestoneStatus): string {
  switch (status) {
    case "pending":
      return "Waiting";
    case "generating_feed":
      return "Generating feed (1:1)";
    case "generating_story":
      return "Generating story (9:16)";
    case "ready":
      return "Ready for review";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

function StatusIcon({ status }: { status: ArtworkV2BatchMilestoneStatus }) {
  if (status === "generating_feed" || status === "generating_story") {
    return <Loader2 className="h-4 w-4 animate-spin text-cos-primary" aria-hidden />;
  }

  if (status === "ready") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />;
  }

  if (status === "failed") {
    return <AlertCircle className="h-4 w-4 text-red-600" aria-hidden />;
  }

  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        status === "cancelled" ? "bg-cos-muted" : "bg-cos-border",
      )}
      aria-hidden
    />
  );
}

export function ArtworkV2BatchGenerateScreen({
  milestones,
  currentIndex,
  isRunning,
  isComplete,
  onCancel,
  onBackToArtworkList,
  onReviewMilestones,
}: ArtworkV2BatchGenerateScreenProps) {
  const activeMilestone = milestones[currentIndex];
  const readyCount = milestones.filter((entry) => entry.status === "ready").length;
  const failedCount = milestones.filter((entry) => entry.status === "failed").length;

  return (
    <div className="space-y-6">
      <header>
        <button
          type="button"
          onClick={onBackToArtworkList}
          disabled={isRunning}
          className="mb-3 text-sm text-cos-muted hover:text-cos-text disabled:opacity-50"
        >
          ← Back to artwork list
        </button>
        <p className="studio-eyebrow">Create</p>
        <h2 className="font-display mt-2 text-3xl text-cos-text sm:text-4xl">
          {isComplete ? "Batch generation complete" : "Generating remaining artwork"}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cos-muted">
          {isComplete
            ? "Review each milestone one at a time — nothing is approved until you choose a version."
            : "Stay on this tab for best results. Each milestone gets its own feed and story artwork."}
        </p>
      </header>

      {isRunning && activeMilestone && (
        <Card className="border-cos-primary/30 bg-cos-info/20">
          <CardHeader>
            <CardTitle className="text-lg">
              Generating milestone {currentIndex + 1} of {milestones.length}: {activeMilestone.title}
            </CardTitle>
            <CardDescription>{statusLabel(activeMilestone.status)}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card padding="none">
        <CardHeader className="px-5 pt-5">
          <CardTitle>Milestone progress</CardTitle>
          <CardDescription>
            Artwork is saved to each milestone&apos;s feed and story slots — not auto-approved.
          </CardDescription>
        </CardHeader>
        <ul className="divide-y divide-cos-border px-5 pb-5">
          {milestones.map((milestone, index) => (
            <li
              key={milestone.relativeDay}
              className="flex items-start gap-3 py-4 first:pt-0 last:pb-0"
            >
              <div className="mt-1 shrink-0">
                <StatusIcon status={milestone.status} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-cos-text">{milestone.title}</p>
                <p className="mt-0.5 text-xs text-cos-muted">{statusLabel(milestone.status)}</p>
                {milestone.error && (
                  <p className="mt-1 text-xs text-red-600" role="alert">
                    {milestone.error}
                  </p>
                )}
              </div>
              {index === currentIndex && isRunning && (
                <span className="shrink-0 text-xs font-medium text-cos-primary">Current</span>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {isRunning ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel remaining
          </Button>
        ) : isComplete ? (
          <>
            <Button type="button" size="lg" onClick={onReviewMilestones}>
              Review generated artwork
            </Button>
            <Button type="button" size="lg" variant="secondary" onClick={onBackToArtworkList}>
              Back to artwork list
            </Button>
            {(readyCount > 0 || failedCount > 0) && (
              <p className="w-full text-sm text-cos-muted">
                {readyCount} milestone{readyCount === 1 ? "" : "s"} ready for review
                {failedCount > 0 ? ` · ${failedCount} failed` : ""}.
              </p>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
