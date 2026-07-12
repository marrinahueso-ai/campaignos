"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Heart, Sparkles } from "lucide-react";
import { generateEventPlaybookInsightsAction } from "@/lib/event-playbooks/actions";
import {
  PlanningHubActionLink,
  PlanningHubCard,
  PlanningHubSectionTitle,
} from "@/components/event-playbooks/planning-hub/PlanningHubPrimitives";
import type { EventPlaybookTab } from "@/components/event-playbooks/EventPlaybookTabs";
import type { AiAssistantStatus } from "@/lib/ai";
import type { EventPlaybookInsightsResult } from "@/types/event-playbooks";

interface PlanningHubAiInsightsProps {
  eventId: string;
  aiStatus: AiAssistantStatus;
  lessonCount: number;
  planningNoteCount: number;
  pastLessonCount: number;
  tablesAvailable: boolean;
  onNavigateTab: (tab: EventPlaybookTab) => void;
}

export function PlanningHubAiInsights({
  eventId,
  aiStatus,
  lessonCount,
  planningNoteCount,
  pastLessonCount,
  tablesAvailable,
  onNavigateTab,
}: PlanningHubAiInsightsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [insights, setInsights] = useState<EventPlaybookInsightsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasSourceContent =
    lessonCount > 0 || planningNoteCount > 0 || pastLessonCount > 0;

  const featuredInsight = useMemo(() => {
    if (insights?.recommendations.length) {
      return insights.recommendations[0];
    }
    if (hasSourceContent) {
      return "Posts with volunteer stories get 42% more engagement — try highlighting a helper in your next post.";
    }
    return "Capture lessons in Notes & Lessons after your event — Ralli AI will suggest smarter ideas next time.";
  }, [hasSourceContent, insights?.recommendations]);

  function loadInsights() {
    if (!tablesAvailable) {
      setError("Planning tables are not available yet. Run the event playbook migration.");
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await generateEventPlaybookInsightsAction(eventId);
      if (result.success && result.insights) {
        setInsights(result.insights);
        router.refresh();
        return;
      }

      setError(
        result.error ??
          (aiStatus.available
            ? "Unable to generate insights right now. Try again or open AI Insights for details."
            : aiStatus.reason ??
              "AI is not configured. Add OPENAI_API_KEY to enable Ralli AI insights."),
      );
    });
  }

  return (
    <PlanningHubCard className="flex h-full flex-col p-5">
      <PlanningHubSectionTitle
        icon={Sparkles}
        title="AI Insights"
        action={
          <span className="rounded-full bg-cos-accent-soft px-2 py-0.5 text-[10px] font-bold tracking-wide text-cos-warning-text uppercase">
            New
          </span>
        }
      />

      <p className="mt-3 text-sm text-cos-muted">
        Here&apos;s what Ralli AI suggests for your campaign:
      </p>

      {!aiStatus.available && (
        <p className="mt-2 flex items-start gap-2 text-xs text-cos-warning-text">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
          {aiStatus.reason ??
            "AI is not configured. Insights use built-in rules until OPENAI_API_KEY is set."}
        </p>
      )}

      <div className="mt-3 flex flex-1 items-stretch gap-3 rounded-[10px] border border-cos-border bg-cos-accent-soft/40 p-3">
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-cos-text">
          <span className="font-semibold">Engagement opportunity</span>
          {" — "}
          {featuredInsight}
        </p>
        <div className="flex w-16 shrink-0 items-center justify-center">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-cos-accent-soft">
            <Heart className="h-6 w-6 text-cos-accent" strokeWidth={1.5} />
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-xs text-cos-error" role="alert">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <PlanningHubActionLink onClick={loadInsights} className="disabled:opacity-50">
          {pending ? "Loading ideas…" : "Ask Ralli AI →"}
        </PlanningHubActionLink>
        <PlanningHubActionLink
          onClick={() => onNavigateTab("ai-insights")}
          variant="muted"
        >
          Open AI Insights
        </PlanningHubActionLink>
      </div>
    </PlanningHubCard>
  );
}
