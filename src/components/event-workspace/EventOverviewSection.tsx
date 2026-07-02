"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { updateEventOverviewAction } from "@/lib/event-workspace/actions";
import {
  getDisplayBudget,
  getDisplayOwner,
  getDisplayVolunteerNeeds,
} from "@/lib/event-workspace/mock-data";
import type { Event } from "@/types";

interface EventOverviewSectionProps {
  event: Event;
}

export function EventOverviewSection({ event }: EventOverviewSectionProps) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    description: event.description,
    time: event.time ?? "",
    location: event.location ?? "",
    audience: event.audience ?? "",
    theme: event.theme ?? "",
    eventOwner: getDisplayOwner(event),
    budget: getDisplayBudget(event),
    volunteerNeeds: getDisplayVolunteerNeeds(event),
  });

  function updateField(field: keyof typeof form, value: string) {
    setSaved(false);
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateEventOverviewAction(event.id, {
        description: form.description,
        time: form.time || null,
        location: form.location || null,
        audience: form.audience || null,
        theme: form.theme || null,
        eventOwner: form.eventOwner || null,
        budget: form.budget || null,
        volunteerNeeds: form.volunteerNeeds || null,
      });

      if (result.success) {
        setSaved(true);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Overview</CardTitle>
        <CardDescription>
          Core event details used across communications and planning workflows.
        </CardDescription>
      </CardHeader>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Textarea
            label="Description"
            value={form.description}
            onChange={(changeEvent) =>
              updateField("description", changeEvent.target.value)
            }
            rows={4}
          />
        </div>
        <Input
          label="Time"
          type="text"
          value={form.time}
          placeholder="5:20 PM (optional)"
          hint="Optional. Examples: 5:20 PM, 17:20"
          autoComplete="off"
          onChange={(changeEvent) => updateField("time", changeEvent.target.value)}
        />
        <Input
          label="Location"
          value={form.location}
          onChange={(changeEvent) =>
            updateField("location", changeEvent.target.value)
          }
        />
        <Input
          label="Audience"
          value={form.audience}
          onChange={(changeEvent) =>
            updateField("audience", changeEvent.target.value)
          }
        />
        <Input
          label="Theme"
          value={form.theme}
          onChange={(changeEvent) => updateField("theme", changeEvent.target.value)}
        />
        <Input
          label="Event Owner"
          value={form.eventOwner}
          onChange={(changeEvent) =>
            updateField("eventOwner", changeEvent.target.value)
          }
        />
        <Input
          label="Budget"
          value={form.budget}
          onChange={(changeEvent) => updateField("budget", changeEvent.target.value)}
          hint="Placeholder budget field for future planning tools."
        />
        <Input
          label="Volunteer Needs"
          value={form.volunteerNeeds}
          onChange={(changeEvent) =>
            updateField("volunteerNeeds", changeEvent.target.value)
          }
          hint="Optional — only fill in if volunteers are needed for this event."
        />
      </div>

      <div className="mt-6 flex items-center justify-between">
        {saved && (
          <p className="text-sm text-emerald-600">Overview saved successfully.</p>
        )}
        <div className="ml-auto">
          <Button onClick={handleSave} disabled={isPending}>
            <Save className="h-4 w-4" />
            {isPending ? "Saving..." : "Save Overview"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
