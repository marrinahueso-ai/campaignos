"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  OverviewInlineSelect,
  OverviewInlineText,
} from "@/components/event-playbooks/OverviewInlineFields";
import { buildPlanningOverviewFromEvent } from "@/lib/event-playbooks/build-planning-overview-state";
import { saveEventPlanningOverviewAction } from "@/lib/event-playbooks/planning-actions";
import {
  DEFAULT_EVENT_TYPE,
  EVENT_TYPES,
} from "@/lib/playbooks/constants";
import type { Event } from "@/types";
import type { EventType } from "@/types/playbooks";

interface OverviewEventDetailsGridProps {
  event: Event;
}

export function OverviewEventDetailsGrid({ event }: OverviewEventDetailsGridProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const overview = buildPlanningOverviewFromEvent(event);

  function refreshAfterSave() {
    startTransition(() => {
      router.refresh();
    });
  }

  async function saveField(
    patch: Partial<ReturnType<typeof buildPlanningOverviewFromEvent>>,
  ) {
    const result = await saveEventPlanningOverviewAction(event.id, {
      ...overview,
      ...patch,
    });
    if (result.success) {
      refreshAfterSave();
    }
  }

  const rows: {
    label: string;
    content: React.ReactNode;
  }[] = [
    {
      label: "Goal",
      content: (
        <OverviewInlineText
          value={overview.goal}
          placeholder="Not set"
          multiline
          rows={2}
          valueClassName="text-sm font-medium text-cos-text"
          onSave={async (goal) => saveField({ goal })}
        />
      ),
    },
    {
      label: "Audience",
      content: (
        <OverviewInlineText
          value={overview.audience}
          placeholder="Not set"
          valueClassName="text-sm font-medium text-cos-text"
          onSave={async (audience) => saveField({ audience })}
        />
      ),
    },
    {
      label: "Location",
      content: (
        <OverviewInlineText
          value={overview.location}
          placeholder="Not set"
          valueClassName="text-sm font-medium text-cos-text"
          onSave={async (location) => saveField({ location })}
        />
      ),
    },
    {
      label: "Expected attendance",
      content: (
        <OverviewInlineText
          value={overview.expectedAttendance}
          displayValue={
            overview.expectedAttendance.trim() ||
            overview.audience.trim() ||
            "TBD"
          }
          placeholder="TBD"
          valueClassName="text-sm font-medium text-cos-text"
          onSave={async (expectedAttendance) => saveField({ expectedAttendance })}
        />
      ),
    },
    {
      label: "Budget",
      content: (
        <OverviewInlineText
          value={overview.budget}
          placeholder="Not set"
          valueClassName="text-sm font-medium text-cos-text"
          onSave={async (budget) => saveField({ budget })}
        />
      ),
    },
    {
      label: "Event type",
      content: (
        <OverviewInlineSelect
          value={overview.eventType}
          options={EVENT_TYPES.map(({ value, label }) => ({ value, label }))}
          placeholder={DEFAULT_EVENT_TYPE}
          valueClassName="text-sm font-medium text-cos-text"
          onSave={async (eventType) =>
            saveField({ eventType: eventType as EventType })
          }
        />
      ),
    },
  ];

  return (
    <div className="mt-6 grid gap-px overflow-hidden rounded-sm border border-cos-border bg-cos-border sm:grid-cols-2">
      {rows.map(({ label, content }) => (
        <div key={label} className="bg-cos-card p-4">
          <p className="cos-section-title">{label}</p>
          <div className="mt-1 min-w-0">{content}</div>
        </div>
      ))}
    </div>
  );
}
