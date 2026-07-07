"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CaptionsArtworkPreview } from "@/components/event-workspace/captions/CaptionsArtworkPreview";
import {
  CaptionsOptionsPanel,
  type CaptionOption,
} from "@/components/event-workspace/captions/CaptionsOptionsPanel";
import { CaptionsMilestoneBar } from "@/components/event-workspace/captions/CaptionsMilestoneBar";
import { CreativeStudioStepHeader } from "@/components/event-workspace/plan/CreativeStudioStepHeader";
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
import { resolveMetaPublishBundleScheduledFor } from "@/lib/meta-publishing/resolve-bundle-scheduled-for";
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

function resolveCaptionRelativeDay(
  milestones: MetaSocialCaptionMilestone[],
  preferredDay: number | null | undefined,
): number {
  if (milestones.length === 0) {
    return 0;
  }

  if (
    preferredDay != null &&
    milestones.some((milestone) => milestone.relativeDay === preferredDay)
  ) {
    return preferredDay;
  }

  return milestones[0].relativeDay;
}

function readMilestoneFeedContent(
  milestone: MetaSocialCaptionMilestone | undefined,
): string | null | undefined {
  return milestone?.feed?.content;
}

interface CampaignCaptionsPageProps {
  eventId: string;
  milestones: MetaSocialCaptionMilestone[];
  metaPublishBundles: MetaPublishBundle[];
  aiStatus: AiAssistantStatus;
  initialRelativeDay?: number | null;
  onFocusedMilestoneChange?: (relativeDay: number) => void;
  onWorkflowStepSelect?: (step: CampaignWorkflowStep) => void;
  onNavigateToArtwork?: () => void;
  backHref?: string;
}

export function CampaignCaptionsPage({
  eventId,
  milestones = [],
  metaPublishBundles = [],
  aiStatus,
  initialRelativeDay = null,
  onFocusedMilestoneChange,
  onWorkflowStepSelect,
  onNavigateToArtwork,
  backHref,
}: CampaignCaptionsPageProps) {
  const router = useRouter();
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);
  const [isSavingOption, startSaveTransition] = useTransition();
  const [usingOptionId, setUsingOptionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedDay, setSelectedDay] = useState<number>(() =>
    resolveCaptionRelativeDay(milestones, initialRelativeDay),
  );

  const selectedMilestone = milestones.find((m) => m.relativeDay === selectedDay);
  const selectedBundle = findMetaPublishBundleForDay(metaPublishBundles, selectedDay);

  const [optionsByDay, setOptionsByDay] = useState<Record<number, CaptionOption[]>>(() => {
    const initial: Record<number, CaptionOption[]> = {};
    for (const milestone of milestones) {
      const fromCaption = buildOptionsFromCaption(readMilestoneFeedContent(milestone));
      if (fromCaption.length > 0) {
        initial[milestone.relativeDay] = fromCaption;
      }
    }
    return initial;
  });

  const [selectedOptionByDay, setSelectedOptionByDay] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const milestone of milestones) {
      const fromCaption = buildOptionsFromCaption(readMilestoneFeedContent(milestone));
      if (fromCaption[0]) {
        initial[milestone.relativeDay] = fromCaption[0].id;
      }
    }
    return initial;
  });

  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    setSelectedDay((current) =>
      resolveCaptionRelativeDay(milestones, initialRelativeDay ?? current),
    );
  }, [initialRelativeDay, milestones]);

  useEffect(() => {
    onFocusedMilestoneChange?.(selectedDay);
  }, [onFocusedMilestoneChange, selectedDay]);

  function handleSelectMilestone(relativeDay: number) {
    setSelectedDay(relativeDay);
  }

  const currentOptions = useMemo(() => {
    const stored = optionsByDay[selectedDay];
    if (stored && stored.length > 0) {
      return stored;
    }

    const fromCaption = buildOptionsFromCaption(readMilestoneFeedContent(selectedMilestone));
    if (fromCaption.length > 0) {
      return fromCaption;
    }

    return PLACEHOLDER_OPTIONS.map((option) => ({
      ...option,
      id: `${selectedDay}-${option.id}`,
    }));
  }, [optionsByDay, selectedDay, selectedMilestone]);

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
    if (!aiStatus.available) {
      return;
    }

    if (!selectedMilestone) {
      setError("Select a milestone before generating captions.");
      return;
    }

    setError(null);
    setIsRegenerating(true);
    const generated: CaptionOption[] = [];

    try {
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
    } catch {
      setError("Unable to generate captions. Refresh the page and try again.");
    } finally {
      setIsRegenerating(false);
    }

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
    if (!aiStatus.available) {
      return;
    }

    if (!selectedMilestone) {
      setError("Select a milestone before generating captions.");
      return;
    }

    setError(null);
    setIsGeneratingMore(true);

    try {
      const result = await generateMetaSocialCaptionAction(eventId, selectedDay, "feed");
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
    } catch {
      setError("Unable to generate captions. Refresh the page and try again.");
    } finally {
      setIsGeneratingMore(false);
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

    if (!selectedMilestone) {
      setError("Select a milestone before saving.");
      return;
    }

    setError(null);
    setOptionsForDay(selectedDay, currentOptions);
    setSelectedOptionByDay((current) => ({ ...current, [selectedDay]: optionId }));
    setUsingOptionId(optionId);

    startSaveTransition(async () => {
      try {
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
        router.refresh();
      } catch {
        setError("Unable to save caption. Refresh the page and try again.");
      } finally {
        setUsingOptionId(null);
      }
    });
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
      <CreativeStudioStepHeader
        eventId={eventId}
        title="Captions"
        description="Create custom captions for each milestone. Our AI suggests engaging copy based on your artwork, audience, and campaign goals."
        backHref={backHref}
      />

      <div className="overflow-hidden border border-cos-border bg-cos-card">
        <CaptionsProgressStepper
          activeStep="schedule"
          onStepSelect={onWorkflowStepSelect}
        />

        <CaptionsMilestoneBar
          milestones={milestones.map((m) => ({
            relativeDay: m.relativeDay,
            title: m.title,
          }))}
          selectedRelativeDay={selectedDay}
          onSelectMilestone={handleSelectMilestone}
          scheduledFor={resolveMetaPublishBundleScheduledFor(selectedBundle)}
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
              isSavingOption={isSavingOption}
              usingOptionId={usingOptionId}
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
