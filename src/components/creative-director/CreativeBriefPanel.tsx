"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import {
  generateCreativeBriefAction,
  updateCreativeBriefAction,
} from "@/lib/creative-director/actions";
import type { CreativeBrief } from "@/lib/creative-director/types";

interface CreativeBriefPanelProps {
  eventId: string;
  brief: CreativeBrief;
  isAiEnhanced: boolean;
  canEdit: boolean;
  onUpdated?: () => void;
}

function BriefSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-cos-muted">
        {title}
      </h3>
      <div className="text-sm leading-relaxed text-cos-text">{children}</div>
    </section>
  );
}

function TagList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-cos-muted">Not set yet</p>;
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-full bg-cos-bg px-3 py-1 text-sm text-cos-text"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function EditableBriefNotes({
  eventId,
  brief,
  onUpdated,
}: {
  eventId: string;
  brief: CreativeBrief;
  onUpdated?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [visualDirection, setVisualDirection] = useState(brief.visualDirection);
  const [doNotUse, setDoNotUse] = useState(brief.doNotUse.join("\n"));

  function handleSave() {
    startTransition(async () => {
      await updateCreativeBriefAction(eventId, {
        ...brief,
        visualDirection,
        doNotUse: doNotUse
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
      });
      onUpdated?.();
    });
  }

  return (
    <div className="rounded-2xl border border-cos-border bg-cos-card p-6 shadow-sm">
      <h3 className="text-sm font-medium text-cos-text">Edit creative direction</h3>
      <p className="mt-1 text-xs text-cos-muted">
        Adjust direction before artwork generation ships. Uploaded files are never replaced.
      </p>
      <div className="mt-4 space-y-4">
        <div>
          <label className="text-xs font-medium text-cos-muted">Visual direction</label>
          <Textarea
            value={visualDirection}
            onChange={(e) => setVisualDirection(e.target.value)}
            rows={4}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-cos-muted">Do not use (one per line)</label>
          <Textarea
            value={doNotUse}
            onChange={(e) => setDoNotUse(e.target.value)}
            rows={3}
            className="mt-1"
          />
        </div>
        <Button size="sm" disabled={isPending} onClick={handleSave}>
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

export function CreativeBriefPanel({
  eventId,
  brief,
  isAiEnhanced,
  canEdit,
  onUpdated,
}: CreativeBriefPanelProps) {
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      await generateCreativeBriefAction(eventId);
      onUpdated?.();
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-cos-text">
            {brief.campaignTitle}
          </h2>
          <p className="mt-1 text-sm text-cos-muted">
            {brief.moodSummary || "Creative direction for this campaign"}
          </p>
          {isAiEnhanced && (
            <p className="mt-2 text-xs text-cos-primary">AI-enhanced from your event context</p>
          )}
        </div>
        {canEdit && (
          <Button size="sm" variant="secondary" disabled={isPending} onClick={handleGenerate}>
            {isPending ? (
              "Generating…"
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {brief.moodSummary ? "Regenerate brief" : "Generate brief"}
              </>
            )}
          </Button>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6 rounded-2xl border border-cos-border bg-cos-card p-6 shadow-sm">
          <BriefSection title="Mood">
            <TagList items={brief.emotionalTone} />
          </BriefSection>
          <BriefSection title="Visual Style">
            <p>{brief.graphicStyle || brief.visualDirection || "—"}</p>
          </BriefSection>
          <BriefSection title="Typography">
            <p>{brief.typographySuggestions || "—"}</p>
          </BriefSection>
          <BriefSection title="Artwork Style">
            <p className="capitalize">{brief.illustrationVsPhotography}</p>
          </BriefSection>
        </div>

        <div className="space-y-6 rounded-2xl border border-cos-border bg-cos-card p-6 shadow-sm">
          <BriefSection title="Color Palette">
            <TagList items={brief.colorPalette} />
          </BriefSection>
          <BriefSection title="Texture / Background">
            <p>{brief.textureBackgroundSuggestions || "—"}</p>
          </BriefSection>
          <BriefSection title="Consistency Rules">
            {brief.consistencyRules.length > 0 ? (
              <ul className="list-inside list-disc space-y-1">
                {brief.consistencyRules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            ) : (
              <p className="text-cos-muted">Not set yet</p>
            )}
          </BriefSection>
          <BriefSection title="Do not use">
            <TagList items={brief.doNotUse} />
          </BriefSection>
        </div>
      </div>

      {canEdit && (
        <EditableBriefNotes eventId={eventId} brief={brief} onUpdated={onUpdated} />
      )}
    </div>
  );
}
