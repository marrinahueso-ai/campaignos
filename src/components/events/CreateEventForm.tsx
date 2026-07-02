"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EventBriefDescriptionSection } from "@/components/events/EventBriefDescriptionSection";
import {
  createEvent,
  type CreateEventFormState,
} from "@/lib/events/actions";
import { COMMUNICATION_STRATEGY_OPTIONS } from "@/lib/events/communication-strategy";
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

const initialState: CreateEventFormState = { error: null };

export function CreateEventForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [description, setDescription] = useState("");
  const [state, formAction, isPending] = useActionState(
    createEvent,
    initialState,
  );

  function getBriefInput(): EventBriefInput {
    const form = formRef.current;
    const fd = form ? new FormData(form) : new FormData();
    const eventType = String(fd.get("eventType") ?? "general_event");
    const eventTypeLabel =
      EVENT_TYPES.find((entry) => entry.value === eventType)?.label ?? null;
    const communicationStrategy = String(fd.get("communicationStrategy") ?? "full_campaign");
    const communicationStrategyLabel =
      COMMUNICATION_STRATEGY_OPTIONS.find(
        (entry) => entry.value === communicationStrategy,
      )?.label ?? null;

    return {
      title: String(fd.get("title") ?? ""),
      roughDescription: description,
      audience: String(fd.get("audience") ?? "").trim() || null,
      theme: String(fd.get("theme") ?? "").trim() || null,
      category: eventTypeLabel,
      eventTypeLabel,
      communicationStrategyLabel,
      location: String(fd.get("location") ?? "").trim() || null,
      date: String(fd.get("date") ?? "").trim() || null,
      time: String(fd.get("time") ?? "").trim() || null,
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
          required
        />

        <Select name="eventType" label="Event Type" defaultValue="general_event">
          {EVENT_TYPES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>

        <Select
          name="communicationStrategy"
          label="How much communication does this event need?"
          defaultValue="full_campaign"
        >
          {COMMUNICATION_STRATEGY_OPTIONS.map(({ value, label, description: optionDescription }) => (
            <option key={value} value={value}>
              {label} — {optionDescription}
            </option>
          ))}
        </Select>

        <EventBriefDescriptionSection
          description={description}
          onDescriptionChange={setDescription}
          getBriefInput={getBriefInput}
          disabled={isPending}
          required
          textareaId="create-event-description"
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <Input name="date" type="date" label="Event Date" required />
          <Input
            name="time"
            type="text"
            label="Event Time"
            placeholder="5:20 PM (optional)"
            hint="Optional. Examples: 5:20 PM, 17:20"
            autoComplete="off"
          />
        </div>

        <Input
          name="location"
          label="Location"
          placeholder="School gymnasium"
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <Input
            name="audience"
            label="Audience"
            placeholder="Families, teachers, community"
          />
          <Input
            name="theme"
            label="Theme"
            placeholder="Spring celebration, community fun"
          />
        </div>

        <Select name="status" label="Status" defaultValue="draft">
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
