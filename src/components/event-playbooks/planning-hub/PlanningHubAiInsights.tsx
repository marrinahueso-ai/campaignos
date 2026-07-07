"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart, Sparkles } from "lucide-react";
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
    if (!tablesAvailable || !aiStatus.available) {
      onNavigateTab("ai-insights");
      return;
    }

    startTransition(async () => {
      const result = await generateEventPlaybookInsightsAction(eventId);
      if (result.success && result.insights) {
        setInsights(result.insights);
      } else {
        onNavigateTab("ai-insights");
      }
      router.refresh();
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

      <PlanningHubActionLink onClick={loadInsights} className="mt-4">
        {pending ? "Loading ideas…" : "View ideas →"}
      </PlanningHubActionLink>
    </PlanningHubCard>
  );
}
