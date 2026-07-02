"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  CheckCircle2,
  Circle,
  MinusCircle,
  Radio,
  Sparkles,
} from "lucide-react";
import { RoleSimulator } from "@/components/dev/RoleSimulator";
import { DraftPreviewPanel } from "@/components/communications-brain/DraftPreviewPanel";
import { EventDetailsChangedNotice } from "@/components/event-workspace/EventDetailsChangedNotice";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { generateStepDraftAction } from "@/lib/communications-brain/actions";
import { isPersistableStepId } from "@/lib/communications-brain/generator";
import {
  completeCommunicationStepAction,
  resetCommunicationStepAction,
  skipCommunicationStepAction,
} from "@/lib/playbooks/actions";
import {
  CHANNEL_LABELS,
  formatRelativeDay,
} from "@/lib/playbooks/constants";
import { formatEventDate, getTodayDateString } from "@/lib/utils/dates";
import type { AiAssistantStatus } from "@/lib/ai";
import type { CampaignRole } from "@/lib/auth/campaign-roles";
import type { StepCommunicationDraft } from "@/types/event-workspace";
import type { EventCommunicationStep } from "@/types/playbooks";

interface CommunicationTimelineSectionProps {
  eventId: string;
  steps: EventCommunicationStep[];
  stepDrafts: StepCommunicationDraft[];
  aiStatus: AiAssistantStatus;
  userRole: CampaignRole;
  showRoleSimulator?: boolean;
  eventDetailsChanged?: boolean;
}

function getStepStatusVariant(
  step: EventCommunicationStep,
  today: string,
): "success" | "warning" | "info" | "default" {
  if (step.status === "completed") return "success";
  if (step.status === "skipped") return "default";
  if (step.dueDate === today) return "warning";
  if (step.dueDate < today) return "warning";
  return "info";
}

function getStepStatusLabel(step: EventCommunicationStep, today: string): string {
  if (step.status === "completed") return "Complete";
  if (step.status === "skipped") return "Skipped";
  if (step.dueDate === today) return "Due Today";
  if (step.dueDate < today) return "Past due";
  return "Upcoming";
}

function previewSnippet(content: string, maxLength = 120): string {
  const line = content.replace(/\s+/g, " ").trim();
  if (line.length <= maxLength) return line;
  return `${line.slice(0, maxLength)}…`;
}

export function CommunicationTimelineSection({
  eventId,
  steps,
  stepDrafts,
  aiStatus,
  userRole,
  showRoleSimulator = false,
  eventDetailsChanged = false,
}: CommunicationTimelineSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draftingStepId, setDraftingStepId] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const today = getTodayDateString();

  const draftsByStepId = new Map(stepDrafts.map((draft) => [draft.stepId, draft]));

  useEffect(() => {
    setDraftError(null);
  }, [stepDrafts]);

  function handleComplete(stepId: string) {
    startTransition(async () => {
      await completeCommunicationStepAction(stepId, eventId);
    });
  }

  function handleSkip(stepId: string) {
    startTransition(async () => {
      await skipCommunicationStepAction(stepId, eventId);
    });
  }

  function handleReset(stepId: string) {
    startTransition(async () => {
      await resetCommunicationStepAction(stepId, eventId);
    });
  }

  function handleGenerateDraft(stepId: string) {
    setDraftError(null);
    setDraftingStepId(stepId);

    startTransition(async () => {
      const result = await generateStepDraftAction(eventId, stepId);

      setDraftingStepId(null);

      if (!result.success) {
        setDraftError(result.error ?? "Unable to draft this step right now.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Communication timeline</CardTitle>
        <CardDescription>
          Channel drafts for newsletter, email, and announcements. Social captions for
          Facebook and Instagram are above.
        </CardDescription>
      </CardHeader>

      {showRoleSimulator && (
        <div className="mx-6 mb-4">
          <RoleSimulator currentRole={userRole} eventPath={`/events/${eventId}`} />
        </div>
      )}

      {eventDetailsChanged && (
        <EventDetailsChangedNotice className="mx-6 mb-4" />
      )}

      {draftError && (
        <p className="mx-6 -mt-2 mb-2 text-sm text-red-600" role="alert">
          {draftError}
        </p>
      )}

      {steps.length === 0 ? (
        <p className="px-6 pb-6 text-sm text-cos-muted">
          Assign a communication playbook to see your campaign timeline steps.
        </p>
      ) : (
      <div className="relative space-y-0 px-6 pb-6">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const statusVariant = getStepStatusVariant(step, today);
          const statusLabel = getStepStatusLabel(step, today);
          const draft = draftsByStepId.get(step.id);
          const canGenerate = isPersistableStepId(step.id);
          const isDraftingThisStep = draftingStepId === step.id;

          return (
            <div key={step.id} className="relative flex gap-4 pb-6 last:pb-0">
              {!isLast && (
                <div className="absolute left-[11px] top-7 h-[calc(100%-12px)] w-0.5 bg-cos-border" />
              )}

              <div className="relative z-10 mt-1 shrink-0">
                {step.status === "completed" ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                ) : step.status === "skipped" ? (
                  <MinusCircle className="h-6 w-6 text-cos-dark-muted" />
                ) : step.dueDate === today ? (
                  <Radio className="h-6 w-6 animate-pulse text-amber-500" />
                ) : (
                  <Circle className="h-6 w-6 text-cos-border" />
                )}
              </div>

              <div className="min-w-0 flex-1 rounded-xl border border-cos-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-cos-text">{step.title}</p>
                    <p className="mt-1 text-sm text-cos-muted">
                      {formatRelativeDay(step.relativeDay)} ·{" "}
                      {formatEventDate(step.dueDate)}
                    </p>
                  </div>
                  <Badge variant={statusVariant}>{statusLabel}</Badge>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-cos-muted">
                  <span className="rounded-md bg-cos-bg-alt px-2 py-0.5 text-xs font-medium">
                    {CHANNEL_LABELS[step.channel] ?? step.channel}
                  </span>
                  {!step.isRequired && (
                    <span className="text-xs text-cos-dark-muted">Optional</span>
                  )}
                  {draft && (
                    <Badge variant="info">Draft ready</Badge>
                  )}
                </div>

                {draft && (
                  <p className="mt-3 text-sm italic text-cos-muted">
                    &ldquo;{previewSnippet(draft.content)}&rdquo;
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={isPending || !canGenerate || !aiStatus.available}
                    onClick={() => handleGenerateDraft(step.id)}
                    title={
                      !aiStatus.available
                        ? (aiStatus.reason ?? undefined)
                        : canGenerate
                          ? undefined
                          : "Assign a live playbook to generate storable drafts"
                    }
                  >
                    <Sparkles className="h-4 w-4" />
                    {isDraftingThisStep
                      ? "Drafting…"
                      : draft
                        ? "Draft again"
                        : "Draft for me"}
                  </Button>

                  {step.status === "upcoming" && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isPending}
                        onClick={() => handleComplete(step.id)}
                      >
                        Mark Complete
                      </Button>
                      {!step.isRequired && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={isPending}
                          onClick={() => handleSkip(step.id)}
                        >
                          Skip
                        </Button>
                      )}
                    </>
                  )}

                  {step.status !== "upcoming" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() => handleReset(step.id)}
                    >
                      Reset to upcoming
                    </Button>
                  )}
                </div>

                {draft && (
                  <DraftPreviewPanel
                    key={`${draft.communicationItemId}-${draft.versionNumber}`}
                    eventId={eventId}
                    draft={draft}
                    userRole={userRole}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </Card>
  );
}
