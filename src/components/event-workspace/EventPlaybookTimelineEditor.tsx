"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { updateEventCommunicationTimelineAction } from "@/lib/playbooks/actions";
import {
  CHANNEL_LABELS,
  formatRelativeDay,
} from "@/lib/playbooks/constants";
import type { CommunicationChannel } from "@/types/event-workspace";
import type { EventCommunicationStep, PlaybookStepInput } from "@/types/playbooks";

interface EventPlaybookTimelineEditorProps {
  eventId: string;
  steps: EventCommunicationStep[];
  /** When true, omit outer card chrome (used inside collapsible). */
  embedded?: boolean;
}

const CHANNEL_OPTIONS = Object.entries(CHANNEL_LABELS).map(([value, label]) => ({
  value: value as CommunicationChannel,
  label,
}));

function stepsToInput(steps: EventCommunicationStep[]): PlaybookStepInput[] {
  return steps.map((step) => ({
    relativeDay: step.relativeDay,
    title: step.title,
    channel: step.channel,
    isRequired: step.isRequired,
    defaultStatus: step.status,
  }));
}

function createEmptyStep(): PlaybookStepInput {
  return {
    relativeDay: -7,
    title: "Custom milestone",
    channel: "facebook",
    isRequired: true,
    defaultStatus: "upcoming",
  };
}

export function EventPlaybookTimelineEditor({
  eventId,
  steps: initialSteps,
  embedded = false,
}: EventPlaybookTimelineEditorProps) {
  const router = useRouter();
  const [steps, setSteps] = useState<PlaybookStepInput[]>(stepsToInput(initialSteps));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateStep(index: number, patch: Partial<PlaybookStepInput>) {
    setSteps((current) =>
      current.map((step, i) => (i === index ? { ...step, ...patch } : step)),
    );
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateEventCommunicationTimelineAction(eventId, steps);
      if (!result.success) {
        setError(result.error ?? "Unable to save timeline.");
        return;
      }
      router.refresh();
    });
  }

  if (initialSteps.length === 0) {
    return null;
  }

  return (
    <div className={embedded ? "pt-2" : "rounded-xl border border-cos-border bg-cos-bg/40 p-4"}>
      {!embedded && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-cos-text">Customize playbook timing</p>
            <p className="mt-1 text-xs text-cos-muted">
              Override default days for this event — e.g. 77 days before instead of 30.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setSteps((current) => [...current, createEmptyStep()])}
            disabled={isPending}
          >
            <Plus className="h-4 w-4" />
            Add milestone
          </Button>
        </div>
      )}

      {embedded && (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <p className="text-xs text-cos-muted">
            Override default days for this event — e.g. 77 days before instead of 30.
          </p>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setSteps((current) => [...current, createEmptyStep()])}
            disabled={isPending}
          >
            <Plus className="h-4 w-4" />
            Add milestone
          </Button>
        </div>
      )}

      <ul className={embedded ? "space-y-3" : "mt-4 space-y-3"}>
        {steps.map((step, index) => (
          <li
            key={`${index}-${step.relativeDay}-${step.title}`}
            className="grid gap-3 rounded-lg border border-cos-border bg-cos-card p-3 sm:grid-cols-[6rem_1fr_10rem_auto]"
          >
            <Input
              label="Days"
              type="number"
              value={step.relativeDay}
              onChange={(event) =>
                updateStep(index, { relativeDay: Number(event.target.value) })
              }
              disabled={isPending}
            />
            <Input
              label="Title"
              value={step.title}
              onChange={(event) => updateStep(index, { title: event.target.value })}
              disabled={isPending}
            />
            <Select
              label="Channel"
              value={step.channel}
              onChange={(event) =>
                updateStep(index, {
                  channel: event.target.value as CommunicationChannel,
                })
              }
              disabled={isPending}
            >
              {CHANNEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-600 hover:bg-red-50"
                onClick={() =>
                  setSteps((current) => current.filter((_, i) => i !== index))
                }
                disabled={isPending || steps.length === 1}
                aria-label={`Remove ${step.title}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <p className="sm:col-span-4 text-xs text-cos-muted">
              {formatRelativeDay(step.relativeDay)}
            </p>
          </li>
        ))}
      </ul>

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <Button type="button" size="sm" onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving…" : "Save timeline overrides"}
        </Button>
      </div>
    </div>
  );
}
