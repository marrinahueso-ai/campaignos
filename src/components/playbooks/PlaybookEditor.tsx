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
import {
  getTimingCatalogEntry,
  isTimingCatalogSuggestedTitle,
  resolveTimingCatalogId,
  TIMING_CATALOG_CUSTOM_VALUE,
  timingCatalogByGroup,
  type TimingCatalogEntry,
} from "@/lib/playbooks/timing-catalog";
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

const BEFORE_TIMINGS = timingCatalogByGroup("before");
const AFTER_TIMINGS = timingCatalogByGroup("after");

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
    title: "Weekly reminder",
    channel: "facebook",
    isRequired: true,
    defaultStatus: "upcoming",
  };
}

function stepFromCatalog(entry: TimingCatalogEntry): PlaybookStepInput {
  return {
    relativeDay: entry.relativeDay,
    title: entry.bestUse,
    channel: "facebook",
    isRequired: true,
    defaultStatus: "upcoming",
  };
}

function sortStepsByRelativeDay(steps: PlaybookStepInput[]): PlaybookStepInput[] {
  return [...steps].sort((a, b) => {
    if (a.relativeDay !== b.relativeDay) {
      return a.relativeDay - b.relativeDay;
    }
    return a.title.localeCompare(b.title);
  });
}

export function PlaybookEditor({ playbook, initialSteps = [] }: PlaybookEditorProps) {
  const router = useRouter();
  const isEditing = Boolean(playbook);
  const [steps, setSteps] = useState<PlaybookStepInput[]>(
    initialSteps.length > 0 ? stepsToInput(initialSteps) : [createEmptyStep()],
  );
  const [catalogPickIds, setCatalogPickIds] = useState<string[]>([]);
  const [customTimingIndexes, setCustomTimingIndexes] = useState<Set<number>>(
    () => {
      const initial =
        initialSteps.length > 0 ? stepsToInput(initialSteps) : [createEmptyStep()];
      const custom = new Set<number>();
      initial.forEach((step, index) => {
        if (
          resolveTimingCatalogId(step.relativeDay, step.title) ===
          TIMING_CATALOG_CUSTOM_VALUE
        ) {
          custom.add(index);
        }
      });
      return custom;
    },
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const action = isEditing
    ? updatePlaybookAction.bind(null, playbook!.id)
    : createPlaybookAction;

  const [state, formAction, isPending] = useActionState(action, initialState);

  useEffect(() => {
    if (!state.success) return;

    // New playbook, or system template forked into an org-editable copy.
    if (state.playbookId && state.playbookId !== playbook?.id) {
      router.push(`/settings/playbooks/${state.playbookId}`);
      return;
    }

    router.refresh();
  }, [state.success, state.playbookId, playbook?.id, router]);

  function remapCustomIndexes(
    mapIndex: (index: number) => number | null,
  ): void {
    setCustomTimingIndexes((current) => {
      const next = new Set<number>();
      for (const index of current) {
        const mapped = mapIndex(index);
        if (mapped != null) next.add(mapped);
      }
      return next;
    });
  }

  function moveStep(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= steps.length) return;

    setSteps((current) => {
      const updated = [...current];
      [updated[index], updated[nextIndex]] = [updated[nextIndex], updated[index]];
      return updated;
    });
    remapCustomIndexes((i) => {
      if (i === index) return nextIndex;
      if (i === nextIndex) return index;
      return i;
    });
  }

  function updateStep(index: number, patch: Partial<PlaybookStepInput>) {
    setSteps((current) =>
      current.map((step, i) => (i === index ? { ...step, ...patch } : step)),
    );
  }

  function applyTimingCatalog(index: number, catalogId: string) {
    if (catalogId === TIMING_CATALOG_CUSTOM_VALUE) {
      setCustomTimingIndexes((current) => new Set(current).add(index));
      return;
    }
    const entry = getTimingCatalogEntry(catalogId);
    if (!entry) return;

    setCustomTimingIndexes((current) => {
      if (!current.has(index)) return current;
      const next = new Set(current);
      next.delete(index);
      return next;
    });

    setSteps((current) =>
      current.map((step, i) => {
        if (i !== index) return step;
        const nextTitle = isTimingCatalogSuggestedTitle(step.title)
          ? entry.bestUse
          : step.title;
        return {
          ...step,
          relativeDay: entry.relativeDay,
          title: nextTitle,
        };
      }),
    );
  }

  function removeStep(index: number) {
    if (steps.length === 1) {
      return;
    }

    const step = steps[index];
    const confirmed = window.confirm(
      `Remove "${step.title}" from this communication plan?\n\nSave the communication plan to apply this change.`,
    );

    if (!confirmed) {
      return;
    }

    setSteps((current) => current.filter((_, i) => i !== index));
    remapCustomIndexes((i) => {
      if (i === index) return null;
      return i > index ? i - 1 : i;
    });
  }

  function addStep() {
    setSteps((current) => [...current, createEmptyStep()]);
  }

  function toggleCatalogPick(id: string) {
    setCatalogPickIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  function addSelectedFromCatalog() {
    if (catalogPickIds.length === 0) return;

    const usedKeys = new Set(
      steps.map((step) => `${step.relativeDay}::${step.title.trim()}`),
    );

    const toAdd: PlaybookStepInput[] = [];
    for (const id of catalogPickIds) {
      const entry = getTimingCatalogEntry(id);
      if (!entry) continue;
      const key = `${entry.relativeDay}::${entry.bestUse}`;
      if (usedKeys.has(key)) continue;
      usedKeys.add(key);
      toAdd.push(stepFromCatalog(entry));
    }

    if (toAdd.length === 0) {
      setCatalogPickIds([]);
      return;
    }

    setSteps((current) => {
      const onlyPlaceholder =
        current.length === 1 &&
        isTimingCatalogSuggestedTitle(current[0]!.title) &&
        current[0]!.relativeDay === -7;
      const base = onlyPlaceholder ? [] : current;
      return sortStepsByRelativeDay([...base, ...toAdd]);
    });
    setCatalogPickIds([]);
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
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="steps" value={JSON.stringify(steps)} />

      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {playbook?.isSystem && (
        <div className="rounded-lg border border-cos-border bg-cos-bg/60 px-4 py-3 text-sm text-cos-muted">
          This is a system template. Saving creates an editable copy for your
          organization with your post changes.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Edit communication plan" : "Create communication plan"}</CardTitle>
          <CardDescription>
            Define the communication strategy for an event type.
          </CardDescription>
        </CardHeader>

        <div className="space-y-4">
          <Input
            name="name"
            label="Communication plan name"
            defaultValue={playbook?.name ?? ""}
            placeholder="PTO Meetings"
            required
          />
          <Textarea
            name="description"
            label="Description"
            defaultValue={playbook?.description ?? ""}
            placeholder="When to use this communication plan..."
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
          <CardTitle>Build from timings</CardTitle>
          <CardDescription>
            Pick countdown moments from the event date, then add them as posts.
            You can still edit titles and channels below.
          </CardDescription>
        </CardHeader>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <CatalogPickGroup
              heading="Before the event"
              entries={BEFORE_TIMINGS}
              selectedIds={catalogPickIds}
              onToggle={toggleCatalogPick}
            />
            <CatalogPickGroup
              heading="After the event"
              entries={AFTER_TIMINGS}
              selectedIds={catalogPickIds}
              onToggle={toggleCatalogPick}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={catalogPickIds.length === 0}
            onClick={addSelectedFromCatalog}
          >
            <Plus className="h-4 w-4" />
            Add selected ({catalogPickIds.length})
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Communication Steps</CardTitle>
          <CardDescription>
            Reorder, edit, and configure each countdown post.
          </CardDescription>
        </CardHeader>

        <div className="space-y-4">
          {steps.map((step, index) => {
            const resolvedId = resolveTimingCatalogId(
              step.relativeDay,
              step.title,
            );
            const isCustom =
              customTimingIndexes.has(index) ||
              resolvedId === TIMING_CATALOG_CUSTOM_VALUE;
            const catalogId = isCustom
              ? TIMING_CATALOG_CUSTOM_VALUE
              : resolvedId;
            const catalogEntry = isCustom
              ? null
              : getTimingCatalogEntry(catalogId);

            return (
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
                  <div className="space-y-2">
                    <Select
                      label="Timing"
                      value={catalogId}
                      onChange={(event) =>
                        applyTimingCatalog(index, event.target.value)
                      }
                    >
                      <optgroup label="Before the event">
                        {BEFORE_TIMINGS.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.label}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="After the event">
                        {AFTER_TIMINGS.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.label}
                          </option>
                        ))}
                      </optgroup>
                      <option value={TIMING_CATALOG_CUSTOM_VALUE}>
                        Custom…
                      </option>
                    </Select>
                    {catalogEntry ? (
                      <p className="text-xs text-cos-muted">
                        Best use: {catalogEntry.bestUse}
                      </p>
                    ) : null}
                    {isCustom ? (
                      <Input
                        label="Custom relative day"
                        type="number"
                        value={step.relativeDay}
                        onChange={(event) =>
                          updateStep(index, {
                            relativeDay: Number(event.target.value),
                          })
                        }
                        hint="Negative = before event, 0 = day of, positive = after"
                      />
                    ) : null}
                  </div>
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
                        defaultStatus: event.target
                          .value as PlaybookStepInput["defaultStatus"],
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
            );
          })}

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
                : "Delete communication plan"}
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
            {isPending
              ? "Saving..."
              : !isEditing
                ? "Create communication plan"
                : playbook?.isSystem
                  ? "Save as my communication plan"
                  : "Save communication plan"}
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

function CatalogPickGroup({
  heading,
  entries,
  selectedIds,
  onToggle,
}: {
  heading: string;
  entries: TimingCatalogEntry[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-cos-border bg-cos-bg/40 p-3">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-cos-muted">
        {heading}
      </p>
      <ul className="space-y-1.5">
        {entries.map((entry) => {
          const checked = selectedIds.includes(entry.id);
          return (
            <li key={entry.id}>
              <label className="flex cursor-pointer items-start gap-2 rounded-lg px-1.5 py-1 hover:bg-white/70">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(entry.id)}
                  className="mt-0.5 h-4 w-4 rounded border-cos-border text-cos-accent"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-cos-text">
                    {entry.label}
                  </span>
                  <span className="block text-xs text-cos-muted">
                    {entry.bestUse}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
