"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { EventBriefDescriptionSection } from "@/components/events/EventBriefDescriptionSection";
import { COMMUNICATION_STRATEGY_LABELS } from "@/lib/events/communication-strategy";
import { EVENT_TYPE_LABELS } from "@/lib/playbooks/constants";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  buildEventDetailsFormState,
  normalizeEventDetailsInput,
} from "@/lib/event-workspace/event-form-utils";
import { updateEventDetailsAction } from "@/lib/event-workspace/actions";
import type { EventBriefInput } from "@/lib/ai/types";
import type { EventDetailsInput } from "@/types/event-workspace";
import type { Event } from "@/types";

interface EventEditDetailsDialogProps {
  event: Event;
  onClose: () => void;
}

export function EventEditDetailsDialog({
  event,
  onClose,
}: EventEditDetailsDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<EventDetailsInput>(() =>
    buildEventDetailsFormState(event),
  );

  useEffect(() => {
    setForm(buildEventDetailsFormState(event));
  }, [event]);

  useEffect(() => {
    function handleKeyDown(keyEvent: KeyboardEvent) {
      if (keyEvent.key === "Escape" && !isPending) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPending, onClose]);

  function updateField<K extends keyof EventDetailsInput>(
    field: K,
    value: EventDetailsInput[K],
  ) {
    setError(null);
    setForm((current) => ({ ...current, [field]: value }));
  }

  function getBriefInput(): EventBriefInput {
    return {
      title: form.title,
      roughDescription: form.description,
      audience: form.audience,
      theme: form.theme,
      category: form.category,
      eventTypeLabel: event.eventType
        ? (EVENT_TYPE_LABELS[event.eventType] ?? null)
        : null,
      communicationStrategyLabel:
        COMMUNICATION_STRATEGY_LABELS[event.communicationStrategy] ?? null,
      location: form.location,
      date: form.date,
      time: form.time,
      volunteerNeeds: form.volunteerNeeds,
    };
  }

  function handleSubmit(submitEvent: React.FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    setError(null);

    startTransition(async () => {
      const normalized = normalizeEventDetailsInput(form);
      if ("error" in normalized) {
        setError(normalized.error);
        return;
      }

      const result = await updateEventDetailsAction(event.id, normalized);

      if (!result.success) {
        setError(result.error ?? "Unable to save event details.");
        return;
      }

      onClose();
      router.refresh();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-cos-text/20 p-4 backdrop-blur-sm"
      onClick={() => {
        if (!isPending) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-event-details-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-cos-border bg-cos-card shadow-xl"
        onClick={(clickEvent) => clickEvent.stopPropagation()}
      >
        <div className="border-b border-cos-border px-6 py-5">
          <h2
            id="edit-event-details-title"
            className="text-lg font-semibold text-cos-text"
          >
            Edit event details
          </h2>
          <p className="mt-1 text-sm text-cos-muted">
            Update core facts used across your workspace, calendar, and future drafts.
            Existing message versions are not changed automatically.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-4 overflow-y-auto px-6 py-5">
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            <Input
              label="Event name"
              value={form.title}
              onChange={(changeEvent) => updateField("title", changeEvent.target.value)}
              required
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Date"
                type="date"
                value={form.date}
                onChange={(changeEvent) => updateField("date", changeEvent.target.value)}
                required
              />
              <Input
                label="Start time"
                type="text"
                value={form.time ?? ""}
                placeholder="5:20 PM (optional)"
                hint="Optional. Examples: 5:20 PM, 17:20"
                autoComplete="off"
                onChange={(changeEvent) =>
                  updateField("time", changeEvent.target.value || null)
                }
              />
            </div>

            <Input
              label="Location"
              value={form.location ?? ""}
              onChange={(changeEvent) =>
                updateField("location", changeEvent.target.value)
              }
            />

            <EventBriefDescriptionSection
              description={form.description}
              onDescriptionChange={(value) => updateField("description", value)}
              getBriefInput={getBriefInput}
              eventId={event.id}
              disabled={isPending}
              required
              textareaId="edit-event-description"
              hint="Rough notes are fine — generate a brief for communicators, then save when ready."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Audience / grade level"
                value={form.audience ?? ""}
                onChange={(changeEvent) =>
                  updateField("audience", changeEvent.target.value)
                }
                hint="e.g. K–5 families, all grades"
              />
              <Input
                label="Theme"
                value={form.theme ?? ""}
                onChange={(changeEvent) => updateField("theme", changeEvent.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Category"
                value={form.category ?? ""}
                onChange={(changeEvent) =>
                  updateField("category", changeEvent.target.value)
                }
              />
              <Input
                label="Event owner"
                value={form.eventOwner ?? ""}
                onChange={(changeEvent) =>
                  updateField("eventOwner", changeEvent.target.value)
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Budget"
                value={form.budget ?? ""}
                onChange={(changeEvent) => updateField("budget", changeEvent.target.value)}
              />
              <Input
                label="Volunteer needs"
                value={form.volunteerNeeds ?? ""}
                onChange={(changeEvent) =>
                  updateField("volunteerNeeds", changeEvent.target.value)
                }
                hint="Optional — only if volunteers are needed."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-cos-border px-6 py-4">
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save details"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface EditEventDetailsButtonProps {
  event: Event;
  size?: "sm" | "md" | "lg";
}

export function EditEventDetailsButton({
  event,
  size = "sm",
}: EditEventDetailsButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size={size}
        onClick={() => setOpen(true)}
      >
        <Pencil className="h-4 w-4" />
        Edit details
      </Button>

      {open && (
        <EventEditDetailsDialog event={event} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
