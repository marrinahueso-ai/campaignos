"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EventBriefDescriptionSection } from "@/components/events/EventBriefDescriptionSection";
import { createEvent } from "@/lib/events/actions";
import {
  type CreateEventFields,
  type CreateEventFormState,
} from "@/lib/events/create-event-form-state";
import {
  COMMUNICATION_STRATEGY_OPTIONS,
  shouldAssignPlaybook,
} from "@/lib/events/communication-strategy";
import { EVENT_TIME_INPUT_HINT } from "@/lib/events/time-input";
import { DEFAULT_EVENT_TYPE, SYSTEM_PLAYBOOK_IDS } from "@/lib/playbooks/constants";
import type { EventBriefInput } from "@/lib/ai/types";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { CommunicationStrategy } from "@/types/communication-strategy";
import type { EventType } from "@/types/playbooks";

export interface CreateEventPlaybookOption {
  id: string;
  name: string;
  eventType: EventType;
}

interface CreateEventFormProps {
  playbookOptions: CreateEventPlaybookOption[];
}

function defaultPlaybookId(options: CreateEventPlaybookOption[]): string {
  const general =
    options.find((option) => option.id === SYSTEM_PLAYBOOK_IDS.general_event) ??
    options.find((option) => option.eventType === "general_event") ??
    options[0];
  return general?.id ?? "";
}

function buildDefaultFields(
  playbookOptions: CreateEventPlaybookOption[],
): CreateEventFields {
  const playbookId = defaultPlaybookId(playbookOptions);
  const selected = playbookOptions.find((option) => option.id === playbookId);
  return {
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    audience: "",
    theme: "",
    status: "draft",
    eventType: selected?.eventType ?? DEFAULT_EVENT_TYPE,
    communicationStrategy: "full_campaign",
    playbookId,
  };
}

const initialState: CreateEventFormState = { error: null };

export function CreateEventForm({ playbookOptions }: CreateEventFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [fields, setFields] = useState<CreateEventFields>(() =>
    buildDefaultFields(playbookOptions),
  );
  const [state, formAction, isPending] = useActionState(
    createEvent,
    initialState,
  );

  useEffect(() => {
    if (state.fields) {
      setFields(state.fields);
    }
  }, [state.fields]);

  function updateField<K extends keyof CreateEventFields>(
    field: K,
    value: CreateEventFields[K],
  ) {
    setFields((current) => ({ ...current, [field]: value }));
  }

  function selectPlaybook(playbookId: string) {
    const selected = playbookOptions.find((option) => option.id === playbookId);
    setFields((current) => ({
      ...current,
      playbookId,
      eventType: selected?.eventType ?? current.eventType,
    }));
  }

  function updateStrategy(value: string) {
    const strategy = value as CommunicationStrategy;
    setFields((current) => {
      const next = { ...current, communicationStrategy: strategy };
      if (
        shouldAssignPlaybook(strategy) &&
        !current.playbookId &&
        playbookOptions.length > 0
      ) {
        const playbookId = defaultPlaybookId(playbookOptions);
        const selected = playbookOptions.find((option) => option.id === playbookId);
        next.playbookId = playbookId;
        next.eventType = selected?.eventType ?? current.eventType;
      }
      return next;
    });
  }

  function getBriefInput(): EventBriefInput {
    const playbookName =
      playbookOptions.find((option) => option.id === fields.playbookId)?.name ??
      null;
    const communicationStrategyLabel =
      COMMUNICATION_STRATEGY_OPTIONS.find(
        (entry) => entry.value === fields.communicationStrategy,
      )?.label ?? null;

    return {
      title: fields.title,
      roughDescription: fields.description,
      audience: fields.audience.trim() || null,
      theme: fields.theme.trim() || null,
      category: playbookName,
      eventTypeLabel: playbookName,
      communicationStrategyLabel,
      location: fields.location.trim() || null,
      date: fields.date.trim() || null,
      time: fields.time.trim() || null,
      volunteerNeeds: null,
    };
  }

  const showPlaybook = shouldAssignPlaybook(
    fields.communicationStrategy as CommunicationStrategy,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Details</CardTitle>
        <CardDescription>
          Choose a playbook and communication strategy. Playbooks come from your
          Settings templates (including custom milestones).
        </CardDescription>
      </CardHeader>

      <form ref={formRef} action={formAction} className="space-y-6">
        {state.error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {state.error}
          </div>
        )}

        <Input
          name="title"
          label="Event Title"
          placeholder="Spring Carnival 2026"
          value={fields.title}
          onChange={(changeEvent) => updateField("title", changeEvent.target.value)}
          required
        />

        <Select
          name="communicationStrategy"
          label="How much communication does this event need?"
          value={fields.communicationStrategy}
          onChange={(changeEvent) => updateStrategy(changeEvent.target.value)}
        >
          {COMMUNICATION_STRATEGY_OPTIONS.map(({ value, label, description: optionDescription }) => (
            <option key={value} value={value}>
              {label} — {optionDescription}
            </option>
          ))}
        </Select>

        {showPlaybook ? (
          <div className="space-y-2">
            <Select
              name="playbookId"
              label="Playbook"
              value={fields.playbookId}
              onChange={(changeEvent) => selectPlaybook(changeEvent.target.value)}
              required
            >
              {playbookOptions.length === 0 ? (
                <option value="">No playbooks available</option>
              ) : (
                playbookOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))
              )}
            </Select>
            <input type="hidden" name="eventType" value={fields.eventType} />
            <p className="text-xs text-cos-muted">
              Options match{" "}
              <Link
                href="/settings/playbooks-milestones"
                className="font-medium text-cos-text underline underline-offset-2 hover:text-cos-primary"
              >
                Settings → Playbooks / Milestones
              </Link>
              .
            </p>
          </div>
        ) : (
          <input type="hidden" name="eventType" value={fields.eventType} />
        )}

        <EventBriefDescriptionSection
          description={fields.description}
          onDescriptionChange={(value) => updateField("description", value)}
          getBriefInput={getBriefInput}
          disabled={isPending}
          required
          textareaId="create-event-description"
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <Input
            name="date"
            type="date"
            label="Event Date"
            value={fields.date}
            onChange={(changeEvent) => updateField("date", changeEvent.target.value)}
            required
          />
          <Input
            name="time"
            type="text"
            label="Event Time"
            placeholder="6p or 6:15 PM (optional)"
            hint={EVENT_TIME_INPUT_HINT}
            value={fields.time}
            onChange={(changeEvent) => updateField("time", changeEvent.target.value)}
            autoComplete="off"
          />
        </div>

        <Input
          name="location"
          label="Location"
          placeholder="School gymnasium"
          value={fields.location}
          onChange={(changeEvent) => updateField("location", changeEvent.target.value)}
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <Input
            name="audience"
            label="Audience"
            placeholder="Families, teachers, community"
            value={fields.audience}
            onChange={(changeEvent) => updateField("audience", changeEvent.target.value)}
          />
          <Input
            name="theme"
            label="Theme"
            placeholder="Spring celebration, community fun"
            value={fields.theme}
            onChange={(changeEvent) => updateField("theme", changeEvent.target.value)}
          />
        </div>

        <Select
          name="status"
          label="Status"
          value={fields.status}
          onChange={(changeEvent) => updateField("status", changeEvent.target.value)}
        >
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="published">Published</option>
        </Select>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating..." : "Create Event"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
