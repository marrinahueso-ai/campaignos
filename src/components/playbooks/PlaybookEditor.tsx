"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  createPlaybookAction,
  deletePlaybookAction,
  hideSystemPlaybookAction,
  updatePlaybookAction,
  type PlaybookActionState,
} from "@/lib/playbooks/actions";
import {
  CHANNEL_LABELS,
  EVENT_TYPES,
  formatRelativeDay,
  orgPlaybookDeleteConfirmMessage,
  STEP_DEFAULT_STATUS_OPTIONS,
  systemPlaybookRemoveConfirmMessage,
} from "@/lib/playbooks/constants";
import type {
  CommunicationPlaybook,
  CommunicationPlaybookStep,
  PlaybookStepInput,
} from "@/types/playbooks";
import type { CommunicationChannel } from "@/types/event-workspace";

interface PlaybookEditorProps {
  playbook?: CommunicationPlaybook;
  initialSteps?: CommunicationPlaybookStep[];
}

const initialState: PlaybookActionState = { error: null, success: false };

function stepsToInput(steps: CommunicationPlaybookStep[]): PlaybookStepInput[] {
  return steps.map((step) => ({
    relativeDay: step.relativeDay,
    title: step.title,
    channel: step.channel,
    isRequired: step.isRequired,
    defaultStatus: step.defaultStatus,
  }));
}

function createEmptyStep(): PlaybookStepInput {
  return {
    relativeDay: -7,
    title: "New Step",
    channel: "facebook",
    isRequired: true,
    defaultStatus: "upcoming",
  };
}

export function PlaybookEditor({ playbook, initialSteps = [] }: PlaybookEditorProps) {
  const router = useRouter();
  const isEditing = Boolean(playbook);
  const [steps, setSteps] = useState<PlaybookStepInput[]>(
    initialSteps.length > 0 ? stepsToInput(initialSteps) : [createEmptyStep()],
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const action = isEditing
    ? updatePlaybookAction.bind(null, playbook!.id)
    : createPlaybookAction;

  const [state, formAction, isPending] = useActionState(action, initialState);

  useEffect(() => {
    if (!state.success) return;

    if (!isEditing && state.playbookId) {
      router.push(`/settings/playbooks/${state.playbookId}`);
    } else {
      router.refresh();
    }
  }, [state.success, state.playbookId, isEditing, router]);

  function moveStep(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= steps.length) return;

    setSteps((current) => {
      const updated = [...current];
      [updated[index], updated[nextIndex]] = [updated[nextIndex], updated[index]];
      return updated;
    });
  }

  function updateStep(index: number, patch: Partial<PlaybookStepInput>) {
    setSteps((current) =>
      current.map((step, i) => (i === index ? { ...step, ...patch } : step)),
    );
  }

  function removeStep(index: number) {
    if (steps.length === 1) {
      return;
    }

    const step = steps[index];
    const confirmed = window.confirm(
      `Remove "${step.title}" from this playbook?\n\nSave the playbook to apply this change.`,
    );

    if (!confirmed) {
      return;
    }

    setSteps((current) => current.filter((_, i) => i !== index));
  }

  function addStep() {
    setSteps((current) => [...current, createEmptyStep()]);
  }

  function handleDeletePlaybook() {
    if (!playbook) {
      return;
    }

    const confirmed = window.confirm(
      playbook.isSystem
        ? systemPlaybookRemoveConfirmMessage(playbook.name)
        : orgPlaybookDeleteConfirmMessage(playbook.name),
    );

    if (!confirmed) {
      return;
    }

    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = playbook.isSystem
        ? await hideSystemPlaybookAction(playbook.id)
        : await deletePlaybookAction(playbook.id);

      if (result.error) {
        setDeleteError(result.error);
        return;
      }
      router.push("/settings/playbooks-milestones");
      router.refresh();
    });
  }

  return (
    <form
      action={formAction}
      className="space-y-6"
      onSubmit={(e) => {
        // #region agent log
        const fd = new FormData(e.currentTarget);
        fetch('http://127.0.0.1:7710/ingest/65b4eb47-1dbb-4922-9af8-eb0ebff6bcb2',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'311bfb'},body:JSON.stringify({sessionId:'311bfb',hypothesisId:'H1',location:'PlaybookEditor.tsx:onSubmit',message:'form submit captured',data:{eventTypeInFormData:fd.get('eventType'),name:fd.get('name'),isSystem:playbook?.isSystem ?? null,playbookEventType:playbook?.eventType ?? null},timestamp:Date.now()})}).catch(()=>{});
        // #endregion agent log
      }}
    >
      <input type="hidden" name="steps" value={JSON.stringify(steps)} />

      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Playbook" : "Create Playbook"}</CardTitle>
          <CardDescription>
            Define the communication strategy for an event type.
          </CardDescription>
        </CardHeader>

        <div className="space-y-4">
          <Input
            name="name"
            label="Playbook Name"
            defaultValue={playbook?.name ?? ""}
            placeholder="Book Fair"
            required
          />
          <Textarea
            name="description"
            label="Description"
            defaultValue={playbook?.description ?? ""}
            placeholder="When to use this playbook..."
          />
          <Select
            name="eventType"
            label="Event Type"
            defaultValue={playbook?.eventType ?? "general_event"}
            disabled={playbook?.isSystem}
          >
            {EVENT_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          {playbook?.isSystem && (
            // Disabled <select> values are excluded from native FormData
            // submission. Mirror the existing (already-correct) Event Type
            // in a hidden input so system-playbook edits still submit it.
            <input type="hidden" name="eventType" value={playbook.eventType} />
          )}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Communication Steps</CardTitle>
          <CardDescription>
            Reorder, edit, and configure each countdown milestone.
          </CardDescription>
        </CardHeader>

        <div className="space-y-4">
          {steps.map((step, index) => (
            <div
              key={index}
              className="rounded-xl border border-cos-border bg-cos-bg/50 p-4"
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-cos-text">
                  Step {index + 1} · {formatRelativeDay(step.relativeDay)}
                </p>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === 0}
                    onClick={() => moveStep(index, -1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === steps.length - 1}
                    onClick={() => moveStep(index, 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={steps.length === 1}
                    onClick={() => removeStep(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Title"
                  value={step.title}
                  onChange={(event) =>
                    updateStep(index, { title: event.target.value })
                  }
                />
                <Input
                  label="Relative Day"
                  type="number"
                  value={step.relativeDay}
                  onChange={(event) =>
                    updateStep(index, {
                      relativeDay: Number(event.target.value),
                    })
                  }
                  hint="Negative = before event, 0 = day of, positive = after"
                />
                <Select
                  label="Channel"
                  value={step.channel}
                  onChange={(event) =>
                    updateStep(index, {
                      channel: event.target.value as CommunicationChannel,
                    })
                  }
                >
                  {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Default Status"
                  value={step.defaultStatus}
                  onChange={(event) =>
                    updateStep(index, {
                      defaultStatus: event.target.value as PlaybookStepInput["defaultStatus"],
                    })
                  }
                >
                  {STEP_DEFAULT_STATUS_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <input
                    id={`required-${index}`}
                    type="checkbox"
                    checked={step.isRequired}
                    onChange={(event) =>
                      updateStep(index, { isRequired: event.target.checked })
                    }
                    className="h-4 w-4 rounded border-cos-border text-cos-accent"
                  />
                  <label
                    htmlFor={`required-${index}`}
                    className="text-sm text-cos-text"
                  >
                    Required step
                  </label>
                </div>
              </div>
            </div>
          ))}

          <Button type="button" variant="secondary" onClick={addStep}>
            <Plus className="h-4 w-4" />
            Add Step
          </Button>
        </div>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        {isEditing && playbook ? (
          <div className="space-y-2">
            <Button
              type="button"
              variant={playbook.isSystem ? "secondary" : "danger"}
              disabled={isDeleting || isPending}
              onClick={handleDeletePlaybook}
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting
                ? playbook.isSystem
                  ? "Removing..."
                  : "Deleting..."
                : "Delete Playbook"}
            </Button>
            {playbook.isSystem && (
              <p className="text-xs text-cos-muted">
                System template — removes from your list only. Duplicate to
                customize, then delete your copy.
              </p>
            )}
          </div>
        ) : (
          <div />
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/settings/playbooks-milestones")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : isEditing ? "Save Playbook" : "Create Playbook"}
          </Button>
        </div>
      </div>

      {deleteError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {deleteError}
        </div>
      )}
    </form>
  );
}
