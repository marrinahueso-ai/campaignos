"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ListPlus, Loader2, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  addPlaybookTaskFromRecommendationAction,
  generateEventPlaybookInsightsAction,
} from "@/lib/event-playbooks/actions";
import { EVENT_TYPE_LABELS, DEFAULT_EVENT_TYPE } from "@/lib/playbooks/constants";
import type { AiAssistantStatus } from "@/lib/ai";
import type {
  EventPlaybookInsightsResult,
  EventPlaybookTask,
} from "@/types/event-playbooks";
import { cn } from "@/lib/utils/cn";

interface AIInsightsTabProps {
  eventId: string;
  eventTitle: string;
  eventType: string | null;
  aiStatus: AiAssistantStatus;
  tasks: EventPlaybookTask[];
  lessonCount: number;
  planningNoteCount: number;
  pastLessonCount: number;
  tablesAvailable: boolean;
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

export function AIInsightsTab({
  eventId,
  eventTitle,
  eventType,
  aiStatus,
  tasks,
  lessonCount,
  planningNoteCount,
  pastLessonCount,
  tablesAvailable,
}: AIInsightsTabProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [insights, setInsights] = useState<EventPlaybookInsightsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addedTitles, setAddedTitles] = useState<Set<string>>(new Set());

  const eventTypeLabel =
    EVENT_TYPE_LABELS[eventType ?? DEFAULT_EVENT_TYPE] ?? "this event type";

  const existingTaskTitles = useMemo(
    () => new Set(tasks.map((t) => normalizeTitle(t.title))),
    [tasks],
  );

  const hasSourceContent =
    lessonCount > 0 || planningNoteCount > 0 || pastLessonCount > 0;

  const sourceSummary = buildSourceSummary({
    lessonCount,
    planningNoteCount,
    pastLessonCount,
    eventTypeLabel,
  });

  function isAlreadyAdded(title: string): boolean {
    const norm = normalizeTitle(title);
    return existingTaskTitles.has(norm) || addedTitles.has(norm);
  }

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateEventPlaybookInsightsAction(eventId);
      if (!result.success || !result.insights) {
        setError(result.error ?? "Unable to generate insights.");
        return;
      }
      setInsights(result.insights);
    });
  }

  function handleAddToChecklist(title: string) {
    if (isAlreadyAdded(title)) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await addPlaybookTaskFromRecommendationAction(eventId, title);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setAddedTitles((prev) => new Set(prev).add(normalizeTitle(title)));
      router.refresh();
    });
  }

  function handleAddAllChecklistItems() {
    if (!insights) {
      return;
    }

    const toAdd = insights.checklistItems.filter((item) => !isAlreadyAdded(item));
    if (toAdd.length === 0) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const newlyAdded = new Set(addedTitles);
      for (const title of toAdd) {
        const result = await addPlaybookTaskFromRecommendationAction(eventId, title);
        if (result.success) {
          newlyAdded.add(normalizeTitle(title));
        }
      }
      setAddedTitles(newlyAdded);
      router.refresh();
    });
  }

  if (!tablesAvailable) {
    return (
      <Card padding="lg">
        <CardHeader>
          <CardTitle>AI insights</CardTitle>
          <CardDescription>
            Run migration 031_event_playbook_tables.sql to enable AI insights.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card padding="lg" className="border-cos-border bg-cos-bg/40">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-cos-border bg-cos-card">
              <Sparkles className="h-5 w-5 text-cos-accent" strokeWidth={1.5} />
            </div>
            <div>
              <CardHeader className="p-0">
                <CardTitle>AI planning insights</CardTitle>
                <CardDescription>
                  {aiStatus.available
                    ? "Generate recommendations and checklist items from lessons learned."
                    : (aiStatus.reason ??
                      "AI not configured — using rule-based insights from your notes.")}
                </CardDescription>
              </CardHeader>
              {hasSourceContent && (
                <p className="mt-3 text-sm text-cos-muted">{sourceSummary}</p>
              )}
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleGenerate}
            disabled={pending}
            className="shrink-0"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate insights
          </Button>
        </div>
      </Card>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {!insights && !pending && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Ready when you are</CardTitle>
            <CardDescription>
              {hasSourceContent
                ? `Click "Generate insights" to turn lessons from ${eventTitle} into actionable recommendations and checklist items.`
                : "Add lessons learned in the Notes tab first — AI Insights works best with real debrief notes from this or past events."}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {insights && (
        <>
          <Card padding="lg">
            <CardHeader>
              <p className="cos-section-title">Recommendations</p>
              <CardTitle className="font-display mt-1 text-xl">
                Action items from lessons
              </CardTitle>
              <CardDescription>
                {insights.usedAi
                  ? "AI-generated from your notes and past event history."
                  : "Generated from your notes using built-in rules."}
              </CardDescription>
            </CardHeader>

            {insights.recommendations.length > 0 ? (
              <ul className="mt-6 space-y-3">
                {insights.recommendations.map((item) => (
                  <InsightRow
                    key={item}
                    text={item}
                    added={isAlreadyAdded(item)}
                    pending={pending}
                    onAdd={() => handleAddToChecklist(item)}
                  />
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-cos-muted">
                No recommendations yet — add more lessons in the Notes tab.
              </p>
            )}
          </Card>

          <Card padding="lg">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <CardHeader className="p-0">
                <p className="cos-section-title">Suggested checklist</p>
                <CardTitle className="font-display mt-1 text-xl">
                  Planning tasks
                </CardTitle>
                <CardDescription>
                  Add individual items or bulk-add the full suggested checklist.
                </CardDescription>
              </CardHeader>
              {insights.checklistItems.some((item) => !isAlreadyAdded(item)) && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleAddAllChecklistItems}
                  disabled={pending}
                  className="shrink-0"
                >
                  <ListPlus className="h-4 w-4" />
                  Add all to checklist
                </Button>
              )}
            </div>

            {insights.checklistItems.length > 0 ? (
              <ul className="mt-6 space-y-3">
                {insights.checklistItems.map((item) => (
                  <InsightRow
                    key={item}
                    text={item}
                    added={isAlreadyAdded(item)}
                    pending={pending}
                    onAdd={() => handleAddToChecklist(item)}
                  />
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-cos-muted">
                All suggested tasks are already on your checklist.
              </p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function InsightRow({
  text,
  added,
  pending,
  onAdd,
}: {
  text: string;
  added: boolean;
  pending: boolean;
  onAdd: () => void;
}) {
  return (
    <li className="flex items-start gap-3 border border-cos-border bg-cos-bg px-4 py-3">
      <p className="flex-1 text-sm leading-relaxed text-cos-text">{text}</p>
      <Button
        type="button"
        size="sm"
        variant={added ? "secondary" : "primary"}
        onClick={onAdd}
        disabled={added || pending}
        className={cn("shrink-0", added && "pointer-events-none")}
      >
        {added ? (
          <>
            <Check className="h-3.5 w-3.5" />
            Added
          </>
        ) : (
          <>
            <Plus className="h-3.5 w-3.5" />
            Add to checklist
          </>
        )}
      </Button>
    </li>
  );
}

function buildSourceSummary(input: {
  lessonCount: number;
  planningNoteCount: number;
  pastLessonCount: number;
  eventTypeLabel: string;
}): string {
  const parts: string[] = [];
  if (input.lessonCount > 0) {
    parts.push(
      `${input.lessonCount} lesson${input.lessonCount === 1 ? "" : "s"} from this event`,
    );
  }
  if (input.planningNoteCount > 0) {
    parts.push(
      `${input.planningNoteCount} planning note${input.planningNoteCount === 1 ? "" : "s"}`,
    );
  }
  if (input.pastLessonCount > 0) {
    parts.push(
      `${input.pastLessonCount} from past ${input.eventTypeLabel} events`,
    );
  }
  return `Informed by ${parts.join(" and ")}.`;
}
