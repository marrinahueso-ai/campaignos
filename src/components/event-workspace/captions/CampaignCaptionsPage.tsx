"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CaptionsArtworkPreview } from "@/components/event-workspace/captions/CaptionsArtworkPreview";
import {
  CaptionsOptionsPanel,
  type CaptionOption,
} from "@/components/event-workspace/captions/CaptionsOptionsPanel";
import { CaptionsMilestoneBar } from "@/components/event-workspace/captions/CaptionsMilestoneBar";
import { CaptionsPageHeader } from "@/components/event-workspace/captions/CaptionsPageHeader";
import { CaptionsProgressStepper } from "@/components/event-workspace/captions/CaptionsProgressStepper";
import { CaptionsPublishPlatforms } from "@/components/event-workspace/captions/CaptionsPublishPlatforms";
import { EmptyState } from "@/components/ui/EmptyState";
import type { CampaignWorkflowStep } from "@/components/event-workspace/CampaignWorkspaceTabs";
import type { AiAssistantStatus } from "@/lib/ai";
import {
  generateMetaSocialCaptionAction,
  saveMetaSocialCaptionAction,
} from "@/lib/meta-captions/actions";
import { findMetaPublishBundleForDay } from "@/lib/meta-publishing/milestone-workflow-badge";
import { planDueDateToScheduledTime } from "@/lib/campaign-plan/plan-milestone-display";
import type { MetaSocialCaptionMilestone } from "@/lib/meta-captions/types";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";
import { CalendarClock } from "lucide-react";

const PLACEHOLDER_OPTIONS: CaptionOption[] = [
  {
    id: "placeholder-1",
    text: "Just two weeks until our Back to School Fair at Emmerson Elementary! 🥳 Mark your calendars for Wednesday, August 5, 2026, and get ready for a day of fun and community. We can't wait to celebrate the start of a new school year with all of you! Let's make some memories together! 🍎",
  },
  {
    id: "placeholder-2",
    text: "Countdown: 2 weeks! Our Back to School Fair is almost here! Join us on Aug 5, 2026 for games, giveaways, spirit wear, and more. Bring your family, invite a friend, and let's kick off the school year right!",
  },
  {
    id: "placeholder-3",
    text: "New year. New friends. New adventures. ✨ We're TWO weeks away from the Back to School Fair on August 5, 2026! Don't miss out on the fun—see you there! 🎡🍎",
  },
];

function createOptionId(): string {
  return `caption-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function buildOptionsFromCaption(content: string | null | undefined): CaptionOption[] {
  if (!content?.trim()) {
    return [];
  }

  return [{ id: createOptionId(), text: content.trim() }];
}

function resolveScheduledFor(bundle: MetaPublishBundle | undefined): string | null {
  if (!bundle) {
    return null;
  }

  if (bundle.scheduledFor) {
    return bundle.scheduledFor;
  }

  return planDueDateToScheduledTime(bundle.dueDate);
}

interface CampaignCaptionsPageProps {
  eventId: string;
  milestones: MetaSocialCaptionMilestone[];
  metaPublishBundles: MetaPublishBundle[];
  aiStatus: AiAssistantStatus;
  initialRelativeDay?: number | null;
  onWorkflowStepSelect?: (step: CampaignWorkflowStep) => void;
  onNavigateToArtwork?: () => void;
}

export function CampaignCaptionsPage({
  eventId,
  milestones,
  metaPublishBundles,
  aiStatus,
  initialRelativeDay = null,
  onWorkflowStepSelect,
  onNavigateToArtwork,
}: CampaignCaptionsPageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultDay = milestones[0]?.relativeDay ?? 0;
  const [selectedDay, setSelectedDay] = useState<number>(
    initialRelativeDay ?? defaultDay,
  );

  const selectedMilestone = milestones.find((m) => m.relativeDay === selectedDay);
  const selectedBundle = findMetaPublishBundleForDay(metaPublishBundles, selectedDay);

  const [optionsByDay, setOptionsByDay] = useState<Record<number, CaptionOption[]>>(() => {
    const initial: Record<number, CaptionOption[]> = {};
    for (const milestone of milestones) {
      const fromCaption = buildOptionsFromCaption(milestone.feed.content);
      if (fromCaption.length > 0) {
        initial[milestone.relativeDay] = fromCaption;
      }
    }
    return initial;
  });

  const [selectedOptionByDay, setSelectedOptionByDay] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const milestone of milestones) {
      const fromCaption = buildOptionsFromCaption(milestone.feed.content);
      if (fromCaption[0]) {
        initial[milestone.relativeDay] = fromCaption[0].id;
      }
    }
    return initial;
  });

  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    if (initialRelativeDay != null) {
      setSelectedDay(initialRelativeDay);
    }
  }, [initialRelativeDay]);

  const currentOptions = useMemo(() => {
    const stored = optionsByDay[selectedDay];
    if (stored && stored.length > 0) {
      return stored;
    }

    const fromCaption = buildOptionsFromCaption(selectedMilestone?.feed.content);
    if (fromCaption.length > 0) {
      return fromCaption;
    }

    return PLACEHOLDER_OPTIONS.map((option) => ({
      ...option,
      id: `${selectedDay}-${option.id}`,
    }));
  }, [optionsByDay, selectedDay, selectedMilestone?.feed.content]);

  const selectedOptionId =
    selectedOptionByDay[selectedDay] ?? currentOptions[0]?.id ?? null;

  const setOptionsForDay = useCallback((day: number, options: CaptionOption[]) => {
    setOptionsByDay((current) => ({ ...current, [day]: options }));
    if (options[0]) {
      setSelectedOptionByDay((current) => ({
        ...current,
        [day]: current[day] ?? options[0].id,
      }));
    }
  }, []);

  async function handleRegenerateAll() {
    if (!aiStatus.available || !selectedMilestone) {
      return;
    }

    setError(null);
    setIsRegenerating(true);
    const generated: CaptionOption[] = [];

    for (let index = 0; index < 3; index += 1) {
      const result = await generateMetaSocialCaptionAction(eventId, selectedDay, "feed");
      if (!result.success) {
        setError(result.error ?? "Unable to generate caption.");
        break;
      }

      const content = result.content?.trim();
      if (!content) {
        break;
      }

      generated.push({ id: createOptionId(), text: content });
    }

    setIsRegenerating(false);

    if (generated.length > 0) {
      setOptionsForDay(selectedDay, generated);
      setSelectedOptionByDay((current) => ({
        ...current,
        [selectedDay]: generated[0].id,
      }));
      router.refresh();
    }
  }

  async function handleGenerateMore() {
    if (!aiStatus.available || !selectedMilestone) {
      return;
    }

    setError(null);
    setIsGeneratingMore(true);

    const result = await generateMetaSocialCaptionAction(eventId, selectedDay, "feed");
    setIsGeneratingMore(false);

    if (!result.success) {
      setError(result.error ?? "Unable to generate caption.");
      return;
    }

    const content = result.content?.trim();
    if (content) {
      const newOption = { id: createOptionId(), text: content };
      setOptionsForDay(selectedDay, [...currentOptions, newOption]);
      router.refresh();
    }
  }

  function handleEditOption(optionId: string, text: string) {
    const updated = currentOptions.map((option) =>
      option.id === optionId ? { ...option, text } : option,
    );
    setOptionsForDay(selectedDay, updated);
  }

  function handleUseOption(optionId: string) {
    const option = currentOptions.find((entry) => entry.id === optionId);
    if (!option?.text.trim()) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await saveMetaSocialCaptionAction(
        eventId,
        selectedDay,
        "feed",
        option.text,
      );
      if (!result.success) {
        setError(result.error ?? "Unable to save caption.");
        return;
      }
      setSelectedOptionByDay((current) => ({ ...current, [selectedDay]: optionId }));
      router.refresh();
    });
  }

  function handleSaveCaptions() {
    const option = currentOptions.find((entry) => entry.id === selectedOptionId);
    if (!option?.text.trim()) {
      setError("Select a caption option before saving.");
      return;
    }

    handleUseOption(option.id);
  }

  if (milestones.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="No milestones for captions"
        description="Approve artwork first — your communication milestones will appear here."
      />
    );
  }

  return (
    <div className="space-y-6">
      <CaptionsPageHeader
        eventId={eventId}
        onSaveCaptions={handleSaveCaptions}
        isSaving={isPending}
        saveDisabled={!selectedOptionId}
      />

      <div className="overflow-hidden border border-cos-border bg-cos-card">
        <CaptionsProgressStepper
          activeStep="schedule"
          completedSteps={["plan", "artwork"]}
          onStepSelect={onWorkflowStepSelect}
        />

        <CaptionsMilestoneBar
          milestones={milestones.map((m) => ({
            relativeDay: m.relativeDay,
            title: m.title,
          }))}
          selectedRelativeDay={selectedDay}
          onSelectMilestone={setSelectedDay}
          scheduledFor={resolveScheduledFor(selectedBundle)}
        />

        <div className="p-5 lg:p-6">
          {error && (
            <p className="mb-4 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="grid gap-5 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] lg:gap-6">
            <CaptionsArtworkPreview
              feedArtworkUrl={selectedBundle?.feedArtworkUrl ?? null}
              storyArtworkUrl={selectedBundle?.storyArtworkUrl ?? null}
              milestoneTitle={selectedMilestone?.title ?? "Milestone"}
              onEditArtwork={onNavigateToArtwork}
            />

            <CaptionsOptionsPanel
              options={currentOptions}
              selectedOptionId={selectedOptionId}
              onSelectOption={(id) =>
                setSelectedOptionByDay((current) => ({ ...current, [selectedDay]: id }))
              }
              onEditOption={handleEditOption}
              onUseOption={handleUseOption}
              onRegenerateAll={handleRegenerateAll}
              onGenerateMore={handleGenerateMore}
              isRegenerating={isRegenerating}
              isGeneratingMore={isGeneratingMore}
              aiAvailable={aiStatus.available}
              aiUnavailableReason={aiStatus.reason}
            />
          </div>
        </div>

        <CaptionsPublishPlatforms />
      </div>
    </div>
  );
}
