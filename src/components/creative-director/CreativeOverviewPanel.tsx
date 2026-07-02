"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { buildCreativeProgressSummary } from "@/lib/creative-director/build-asset-plan";
import type { AssetPlanItem, CreativeBrief, StyleMemoryEntry } from "@/lib/creative-director/types";

interface CreativeOverviewPanelProps {
  eventId: string;
  brief: CreativeBrief;
  plan: AssetPlanItem[];
  styleMemory: StyleMemoryEntry[];
}

export function CreativeOverviewPanel({
  eventId,
  brief,
  plan,
  styleMemory,
}: CreativeOverviewPanelProps) {
  const summary = buildCreativeProgressSummary(plan);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Assets planned" value={String(summary.total)} />
        <StatCard label="Approved" value={String(summary.approved)} />
        <StatCard label="In progress" value={String(summary.inProgress)} />
        <StatCard label="Needs artwork" value={String(summary.needed)} />
      </div>

      <div className="rounded-2xl border border-cos-border bg-cos-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-cos-text">Creative direction</h2>
        <p className="mt-2 text-sm leading-relaxed text-cos-muted">
          {brief.moodSummary || brief.visualDirection || "Generate a creative brief to set direction."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(brief.emotionalTone.length > 0 ? brief.emotionalTone : brief.personality).map(
            (tag) => (
              <span
                key={tag}
                className="rounded-full bg-cos-bg px-3 py-1 text-xs text-cos-text"
              >
                {tag}
              </span>
            ),
          )}
        </div>
      </div>

      {styleMemory.length > 0 && (
        <div className="rounded-2xl border border-cos-border bg-cos-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-cos-text">Style memory</h2>
          <p className="mt-1 text-xs text-cos-muted">
            Approved artwork from past campaigns informs new briefs.
          </p>
          <ul className="mt-4 space-y-2">
            {styleMemory.slice(0, 4).map((entry) => (
              <li key={entry.id} className="text-sm text-cos-text">
                {entry.eventTitle} — {entry.style.style}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button href={`/creative-studio?campaign=${eventId}&tab=brief`} size="sm">
          View creative brief
        </Button>
        <Button
          href={`/creative-studio?campaign=${eventId}&tab=planner`}
          size="sm"
          variant="secondary"
        >
          Open asset planner
        </Button>
        <Button href={`/events/${eventId}?tab=creative`} size="sm" variant="ghost">
          <ExternalLink className="h-4 w-4" />
          Campaign creative progress
        </Button>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-cos-border bg-cos-card px-5 py-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-cos-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-cos-text">{value}</p>
    </div>
  );
}
