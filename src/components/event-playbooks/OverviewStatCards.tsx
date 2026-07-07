"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CalendarDays, Users } from "lucide-react";
import {
  OverviewInlineSelect,
  OverviewInlineText,
} from "@/components/event-playbooks/OverviewInlineFields";
import { buildPlanningOverviewFromEvent } from "@/lib/event-playbooks/build-planning-overview-state";
import { saveEventPlanningOverviewAction } from "@/lib/event-playbooks/planning-actions";
import {
  buildEventDetailsFormState,
  normalizeEventDetailsInput,
  toTimeInputValue,
} from "@/lib/event-workspace/event-form-utils";
import { updateEventDetailsAction } from "@/lib/event-workspace/actions";
import { withCommitteePersonOption } from "@/lib/event-workspace/plan/milestone-planning-context-utils";
import { formatEventDate, formatEventTime } from "@/lib/utils/dates";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import type { Event } from "@/types";

interface OverviewStatCardsProps {
  event: Event;
  ownership: EventRosterOwnership | null;
  committeePersonOptions?: string[];
  defaultCommitteePerson?: string;
}

function formatChairDisplay(
  event: Event,
  ownership: EventRosterOwnership | null,
): string {
  const owner = event.eventOwner?.trim();
  if (owner) {
    return owner;
  }
  if (ownership?.chairNames.length) {
    return ownership.chairNames.join(", ");
  }
  return "Unassigned";
}

export function OverviewStatCards({
  event,
  ownership,
  committeePersonOptions = [],
  defaultCommitteePerson = "",
}: OverviewStatCardsProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const formattedTime = formatEventTime(event.time);
  const attendanceEstimate =
    event.expectedAttendance?.trim() || event.audience?.trim() || "TBD";
  const budgetDisplay = event.budget?.trim() || "Not set";
  const chairDisplay = formatChairDisplay(event, ownership);
  const chairValue = event.eventOwner?.trim() ?? "";

  const chairOptions = withCommitteePersonOption(
    [
      ...committeePersonOptions,
      ...(defaultCommitteePerson ? [defaultCommitteePerson] : []),
      ...((ownership?.chairNames ?? [])),
    ].filter((name, index, all) => all.indexOf(name) === index),
    chairValue,
  ).map((name) => ({ value: name, label: name }));

  function refreshAfterSave() {
    startTransition(() => {
      router.refresh();
    });
  }

  async function savePlanningField(
    patch: Partial<ReturnType<typeof buildPlanningOverviewFromEvent>>,
  ) {
    const result = await saveEventPlanningOverviewAction(event.id, {
      ...buildPlanningOverviewFromEvent(event),
      ...patch,
    });
    if (result.success) {
      refreshAfterSave();
    }
  }

  async function saveEventDetails(
    patch: Partial<ReturnType<typeof buildEventDetailsFormState>>,
  ) {
    const merged = { ...buildEventDetailsFormState(event), ...patch };
    const normalized = normalizeEventDetailsInput(merged);
    if ("error" in normalized) {
      return;
    }
    const result = await updateEventDetailsAction(event.id, normalized);
    if (result.success) {
      refreshAfterSave();
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatMiniCard
        label="Event date"
        icon={CalendarDays}
        sub={
          <OverviewInlineText
            value={toTimeInputValue(event.time)}
            displayValue={formattedTime ?? "Add time"}
            placeholder="Add time"
            valueClassName="text-xs text-cos-dark-muted"
            onSave={async (time) => {
              await saveEventDetails({ time: time || null });
            }}
          />
        }
      >
        <OverviewInlineText
          value={event.date}
          displayValue={formatEventDate(event.date)}
          placeholder="Set date"
          inputType="date"
          valueClassName="font-display text-xl text-cos-text"
          onSave={async (date) => {
            await saveEventDetails({ date });
          }}
        />
      </StatMiniCard>

      <StatMiniCard label="Expected attendance" icon={Users}>
        <OverviewInlineText
          value={event.expectedAttendance ?? ""}
          displayValue={attendanceEstimate}
          placeholder="TBD"
          valueClassName="font-display text-xl text-cos-text"
          onSave={async (expectedAttendance) => {
            await savePlanningField({ expectedAttendance });
          }}
        />
      </StatMiniCard>

      <StatMiniCard label="Budget">
        <OverviewInlineText
          value={event.budget ?? ""}
          displayValue={budgetDisplay}
          placeholder="Not set"
          valueClassName="font-display text-xl text-cos-text"
          onSave={async (budget) => {
            await savePlanningField({ budget });
          }}
        />
      </StatMiniCard>

      <StatMiniCard
        label="Chair"
        sub={
          ownership?.committeeName
            ? ownership.committeeName
            : "Assign event lead"
        }
      >
        {chairOptions.length > 0 ? (
          <OverviewInlineSelect
            value={chairValue}
            options={[
              { value: "", label: "Unassigned" },
              ...chairOptions,
            ]}
            placeholder="Unassigned"
            valueClassName="font-display text-xl text-cos-text"
            onSave={async (eventOwner) => {
              await saveEventDetails({ eventOwner: eventOwner || null });
            }}
          />
        ) : (
          <OverviewInlineText
            value={event.eventOwner ?? ""}
            displayValue={chairDisplay}
            placeholder="Unassigned"
            valueClassName="font-display text-xl text-cos-text"
            onSave={async (eventOwner) => {
              await saveEventDetails({ eventOwner: eventOwner || null });
            }}
          />
        )}
      </StatMiniCard>
    </div>
  );
}

function StatMiniCard({
  label,
  icon: Icon,
  sub,
  children,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  sub?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-cos-border bg-cos-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="cos-section-title">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-cos-dark-muted" strokeWidth={1.5} />}
      </div>
      <div className="mt-2">{children}</div>
      {sub && <div className="mt-1">{sub}</div>}
    </div>
  );
}
