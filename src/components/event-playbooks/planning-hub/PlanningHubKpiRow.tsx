"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  CalendarDays,
  Clock3,
  DollarSign,
  Users,
} from "lucide-react";
import {
  OverviewInlineText,
} from "@/components/event-playbooks/OverviewInlineFields";
import {
  PlanningHubActionLink,
  PlanningHubCard,
  PlanningHubKpiLabel,
} from "@/components/event-playbooks/planning-hub/PlanningHubPrimitives";
import { buildPlanningOverviewFromEvent } from "@/lib/event-playbooks/build-planning-overview-state";
import { saveEventPlanningOverviewAction } from "@/lib/event-playbooks/planning-actions";
import { buildGoogleCalendarUrl } from "@/lib/event-playbooks/planning-hub-utils";
import {
  buildEventDetailsFormState,
  normalizeEventDetailsInput,
} from "@/lib/event-workspace/event-form-utils";
import { updateEventDetailsAction } from "@/lib/event-workspace/actions";
import { formatEventDate, getEventCountdown } from "@/lib/utils/dates";
import type { EventPlaybookTab } from "@/components/event-playbooks/EventPlaybookTabs";
import type { Event } from "@/types";

interface PlanningHubKpiRowProps {
  event: Event;
  taskProgressPercent: number;
  doneTaskCount: number;
  totalTaskCount: number;
  onNavigateTab: (tab: EventPlaybookTab) => void;
}

function CompactProgressRing({
  percent,
  size = 40,
  strokeWidth = 3,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--cos-border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--cos-accent)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-sm font-semibold text-cos-text">
        {percent}%
      </span>
    </div>
  );
}

export function PlanningHubKpiRow({
  event,
  taskProgressPercent,
  doneTaskCount,
  totalTaskCount,
  onNavigateTab,
}: PlanningHubKpiRowProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const countdown = getEventCountdown(event.date);
  const attendanceEstimate =
    event.expectedAttendance?.trim() || event.audience?.trim() || "TBD";
  const budgetDisplay = event.budget?.trim() || "Not set";
  const calendarUrl = buildGoogleCalendarUrl(event);

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

  const kpiCardClass =
    "flex flex-col items-center px-2.5 py-2 text-center";
  const kpiValueClass =
    "mt-1.5 flex flex-col items-center justify-center [&>button]:w-auto [&>button]:text-center";

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <PlanningHubCard className={kpiCardClass}>
        <PlanningHubKpiLabel icon={CalendarDays} label="Event date" />
        <div className={kpiValueClass}>
          <OverviewInlineText
            value={event.date}
            displayValue={formatEventDate(event.date)}
            placeholder="Set date"
            inputType="date"
            valueClassName="font-display text-xl leading-tight"
            onSave={async (date) => {
              await saveEventDetails({ date });
            }}
          />
        </div>
        <PlanningHubActionLink href={calendarUrl} className="mt-1.5 self-center">
          Add to calendar →
        </PlanningHubActionLink>
      </PlanningHubCard>

      <PlanningHubCard className={kpiCardClass}>
        <PlanningHubKpiLabel icon={Clock3} label="Days to go" />
        <div className="mt-2 flex flex-col items-center justify-center">
          <p className="font-display text-3xl leading-none text-cos-text">
            {countdown.isPast ? "0" : countdown.daysRemaining}
          </p>
          <p className="mt-0.5 text-xs text-cos-muted">
            {countdown.isPast ? "Event completed" : "Let's crush it! 🎉"}
          </p>
        </div>
      </PlanningHubCard>

      <PlanningHubCard className={kpiCardClass}>
        <PlanningHubKpiLabel icon={Users} label="Expected attendance" />
        <div className={kpiValueClass}>
          <OverviewInlineText
            value={event.expectedAttendance ?? ""}
            displayValue={attendanceEstimate}
            placeholder="TBD"
            valueClassName="font-display text-xl leading-tight"
            onSave={async (expectedAttendance) => {
              await savePlanningField({ expectedAttendance });
            }}
          />
        </div>
        <PlanningHubActionLink onClick={() => onNavigateTab("overview")} className="mt-1.5 self-center">
          Update estimate →
        </PlanningHubActionLink>
      </PlanningHubCard>

      <PlanningHubCard className={kpiCardClass}>
        <PlanningHubKpiLabel icon={DollarSign} label="Budget" />
        <div className={kpiValueClass}>
          <OverviewInlineText
            value={event.budget ?? ""}
            displayValue={budgetDisplay}
            placeholder="Not set"
            valueClassName="font-display text-xl leading-tight"
            onSave={async (budget) => {
              await savePlanningField({ budget });
            }}
          />
        </div>
        <PlanningHubActionLink onClick={() => onNavigateTab("settings")} className="mt-1.5 self-center">
          Set budget →
        </PlanningHubActionLink>
      </PlanningHubCard>

      <PlanningHubCard className={kpiCardClass}>
        <PlanningHubKpiLabel icon={CheckSquareIcon} label="Task progress" />
        <div className="mt-1.5 flex flex-col items-center justify-center gap-1">
          <CompactProgressRing percent={taskProgressPercent} />
          <p className="font-display text-lg leading-tight text-cos-text">
            {doneTaskCount} of {totalTaskCount} tasks
          </p>
        </div>
        <PlanningHubActionLink onClick={() => onNavigateTab("tasks")} className="mt-1.5 self-center">
          View tasks →
        </PlanningHubActionLink>
      </PlanningHubCard>
    </div>
  );
}

function CheckSquareIcon({
  className,
  strokeWidth = 1.5,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 12l2.5 2.5L16 9" />
    </svg>
  );
}
