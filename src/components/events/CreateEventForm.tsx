"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EventBriefDescriptionSection } from "@/components/events/EventBriefDescriptionSection";
import { createEvent } from "@/lib/events/actions";
import {
  type CreateEventFields,
  type CreateEventFormState,
} from "@/lib/events/create-event-form-state";
import { COMMUNICATION_STRATEGY_OPTIONS } from "@/lib/events/communication-strategy";
import { EVENT_TIME_INPUT_HINT } from "@/lib/events/time-input";
import { EVENT_TYPES } from "@/lib/playbooks/constants";
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

const DEFAULT_FIELDS: CreateEventFields = {
  title: "",
  description: "",
  date: "",
  time: "",
  location: "",
  audience: "",
  theme: "",
  status: "draft",
  eventType: "general_event",
  communicationStrategy: "full_campaign",
};

const initialState: CreateEventFormState = { error: null };

export function CreateEventForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [fields, setFields] = useState<CreateEventFields>(DEFAULT_FIELDS);
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

  function getBriefInput(): EventBriefInput {
    const eventTypeLabel =
      EVENT_TYPES.find((entry) => entry.value === fields.eventType)?.label ?? null;
    const communicationStrategyLabel =
      COMMUNICATION_STRATEGY_OPTIONS.find(
        (entry) => entry.value === fields.communicationStrategy,
      )?.label ?? null;

    return {
      title: fields.title,
      roughDescription: fields.description,
      audience: fields.audience.trim() || null,
      theme: fields.theme.trim() || null,
      category: eventTypeLabel,
      eventTypeLabel,
      communicationStrategyLabel,
      location: fields.location.trim() || null,
      date: fields.date.trim() || null,
      time: fields.time.trim() || null,
      volunteerNeeds: null,
    };
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Details</CardTitle>
        <CardDescription>
          Choose an event type and communication strategy. Not every event needs a
          full campaign.
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
          name="eventType"
          label="Event Type"
          value={fields.eventType}
          onChange={(changeEvent) => updateField("eventType", changeEvent.target.value)}
        >
          {EVENT_TYPES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>

        <Select
          name="communicationStrategy"
          label="How much communication does this event need?"
          value={fields.communicationStrategy}
          onChange={(changeEvent) =>
            updateField("communicationStrategy", changeEvent.target.value)
          }
        >
          {COMMUNICATION_STRATEGY_OPTIONS.map(({ value, label, description: optionDescription }) => (
            <option key={value} value={value}>
              {label} — {optionDescription}
            </option>
          ))}
        </Select>

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
