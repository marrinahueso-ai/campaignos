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
  commitMetaSocialCaptionAction,
  generateMetaSocialCaptionAction,
  saveMetaSocialCaptionAction,
} from "@/lib/meta-captions/actions";
import type {
  MetaCaptionGenerationOptions,
  MetaCaptionLength,
  MetaCaptionTone,
} from "@/lib/meta-captions/types";
import { setMetaPublishPlatformEnabledAction } from "@/lib/meta-publishing/actions";
import { findMetaPublishBundleForDay } from "@/lib/meta-publishing/milestone-workflow-badge";
import { resolveMetaPublishBundleScheduledFor } from "@/lib/meta-publishing/resolve-bundle-scheduled-for";
import type { MetaSocialCaptionMilestone } from "@/lib/meta-captions/types";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";
import { CalendarClock } from "lucide-react";

const DEFAULT_TONE: MetaCaptionTone = "Friendly";
const DEFAULT_LENGTH: MetaCaptionLength = "Medium";

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

function resolveExistingCaptionContext(
  options: CaptionOption[],
  selectedOptionId: string | null,
  milestone: MetaSocialCaptionMilestone | undefined,
): string | null {
  if (selectedOptionId) {
    const selected = options.find((option) => option.id === selectedOptionId);
    if (selected?.text.trim()) {
      return selected.text.trim();
    }
  }

  const fromMilestone = readMilestoneFeedContent(milestone)?.trim();
  if (fromMilestone) {
    return fromMilestone;
  }

  const firstOption = options.find((option) => option.text.trim());
  return firstOption?.text.trim() ?? null;
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
  onNavigateToPublish?: (relativeDay: number) => void;
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
  onNavigateToPublish,
  backHref,
}: CampaignCaptionsPageProps) {
  const router = useRouter();
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);
  const [isSavingOption, startSaveTransition] = useTransition();
  const [isTogglingPlatform, startPlatformTransition] = useTransition();
  const [usingOptionId, setUsingOptionId] = useState<string | null>(null);
  const [savingOptionId, setSavingOptionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tone, setTone] = useState<MetaCaptionTone>(DEFAULT_TONE);
  const [length, setLength] = useState<MetaCaptionLength>(DEFAULT_LENGTH);

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

  useEffect(() => {
    setOptionsByDay((current) => {
      const next = { ...current };
      for (const milestone of milestones) {
        const fromCaption = buildOptionsFromCaption(readMilestoneFeedContent(milestone));
        if (fromCaption.length === 0) {
          continue;
        }

        const existing = next[milestone.relativeDay] ?? [];
        const hasSavedContent = existing.some(
          (option) => option.text.trim() === fromCaption[0].text.trim(),
        );
        if (!hasSavedContent) {
          next[milestone.relativeDay] = [...existing, ...fromCaption];
        }
      }
      return next;
    });

    setSelectedOptionByDay((current) => {
      const next = { ...current };
      for (const milestone of milestones) {
        const fromCaption = buildOptionsFromCaption(readMilestoneFeedContent(milestone));
        if (fromCaption[0] && !next[milestone.relativeDay]) {
          next[milestone.relativeDay] = fromCaption[0].id;
        }
      }
      return next;
    });
  }, [milestones]);

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

    return [];
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

  async function handleGenerateCaption(generationOptions: MetaCaptionGenerationOptions) {
    if (!aiStatus.available) {
      return;
    }

    if (!selectedMilestone) {
      setError("Select a milestone before generating captions.");
      return;
    }

    setError(null);
    setIsRegenerating(true);

    const revisionContext = resolveExistingCaptionContext(
      currentOptions,
      selectedOptionId,
      selectedMilestone,
    );

    try {
      const result = await generateMetaSocialCaptionAction(
        eventId,
        selectedDay,
        "feed",
        { ...generationOptions, revisionContext },
      );
      if (!result.success) {
        setError(result.error ?? "Unable to generate caption.");
        return;
      }

      const content = result.content?.trim();
      if (content) {
        const newOption = { id: createOptionId(), text: content };
        setOptionsForDay(selectedDay, [newOption]);
        setSelectedOptionByDay((current) => ({
          ...current,
          [selectedDay]: newOption.id,
        }));
        router.refresh();
      }
    } catch {
      setError("Unable to generate captions. Refresh the page and try again.");
    } finally {
      setIsRegenerating(false);
    }
  }

  async function handleGenerateMore(generationOptions: MetaCaptionGenerationOptions) {
    if (!aiStatus.available) {
      return;
    }

    if (!selectedMilestone) {
      setError("Select a milestone before generating captions.");
      return;
    }

    setError(null);
    setIsGeneratingMore(true);

    const revisionContext = resolveExistingCaptionContext(
      currentOptions,
      selectedOptionId,
      selectedMilestone,
    );

    try {
      const result = await generateMetaSocialCaptionAction(
        eventId,
        selectedDay,
        "feed",
        { ...generationOptions, revisionContext },
      );
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

  function handleSaveOption(optionId: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    const updated = currentOptions.map((option) =>
      option.id === optionId ? { ...option, text: trimmed } : option,
    );
    setOptionsForDay(selectedDay, updated);
    setSavingOptionId(optionId);
    setError(null);

    startSaveTransition(async () => {
      try {
        const result = await saveMetaSocialCaptionAction(
          eventId,
          selectedDay,
          "feed",
          trimmed,
        );
        if (!result.success) {
          setError(result.error ?? "Unable to save caption.");
          return;
        }
        router.refresh();
      } catch {
        setError("Unable to save caption. Refresh the page and try again.");
      } finally {
        setSavingOptionId(null);
      }
    });
  }

  const publishPlatforms = useMemo(
    () => [
      {
        id: "instagram" as const,
        label: "Instagram",
        checked: selectedBundle?.publishPlatforms.instagram ?? true,
        disabled: isTogglingPlatform,
      },
      {
        id: "facebook" as const,
        label: "Facebook",
        checked: selectedBundle?.publishPlatforms.facebook ?? true,
        disabled: isTogglingPlatform,
      },
      {
        id: "linkedin" as const,
        label: "LinkedIn",
        checked: false,
        disabled: true,
      },
    ],
    [isTogglingPlatform, selectedBundle],
  );

  function handleTogglePlatform(platform: "instagram" | "facebook" | "linkedin") {
    if (platform === "linkedin") {
      return;
    }

    const current = publishPlatforms.find((entry) => entry.id === platform);
    if (!current || current.disabled) {
      return;
    }

    setError(null);
    startPlatformTransition(async () => {
      try {
        const result = await setMetaPublishPlatformEnabledAction(
          eventId,
          selectedDay,
          platform,
          !current.checked,
        );
        if (!result.success) {
          setError(result.error ?? "Unable to update publish platforms.");
          return;
        }
        router.refresh();
      } catch {
        setError("Unable to update publish platforms. Refresh the page and try again.");
      }
    });
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
        const result = await commitMetaSocialCaptionAction(
          eventId,
          selectedDay,
          option.text,
        );
        if (!result.success) {
          setError(result.error ?? "Unable to save caption.");
          return;
        }
        router.refresh();
        onNavigateToPublish?.(selectedDay);
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
              onEditArtwork={() => {
                onFocusedMilestoneChange?.(selectedDay);
                onNavigateToArtwork?.();
              }}
            />

            <CaptionsOptionsPanel
              options={currentOptions}
              selectedOptionId={selectedOptionId}
              tone={tone}
              length={length}
              onToneChange={setTone}
              onLengthChange={setLength}
              onSelectOption={(id) =>
                setSelectedOptionByDay((current) => ({ ...current, [selectedDay]: id }))
              }
              onSaveOption={handleSaveOption}
              onUseOption={handleUseOption}
              onGenerateCaption={handleGenerateCaption}
              onGenerateMore={handleGenerateMore}
              isRegenerating={isRegenerating}
              isGeneratingMore={isGeneratingMore}
              isSavingOption={isSavingOption}
              savingOptionId={savingOptionId}
              usingOptionId={usingOptionId}
              aiAvailable={aiStatus.available}
              aiUnavailableReason={aiStatus.reason}
            />
          </div>
        </div>

        <CaptionsPublishPlatforms
          platforms={publishPlatforms}
          onTogglePlatform={handleTogglePlatform}
        />
      </div>
    </div>
  );
}
