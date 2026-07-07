"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Calendar, Check, ChevronRight, Sparkles, User } from "lucide-react";
import {
  CAMPAIGN_WORKFLOW_STEP_LABELS,
  resolveCompletedWorkflowSteps,
  type CampaignWorkflowStep,
} from "@/components/event-workspace/CampaignWorkspaceTabs";
import { SocialMediaCenterSidebar } from "@/components/event-workspace/plan/SocialMediaCenterSidebar";
import { MILESTONE_PLANNING_COLORS } from "@/components/event-workspace/plan/milestone-planning-utils";
import { COMMUNICATION_STRATEGY_OPTIONS } from "@/lib/events/communication-strategy";
import { hasDisplayableArtwork } from "@/lib/event-workspace/has-displayable-artwork";
import { formatEventDate } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";
import type { EventPlaybookTask } from "@/types/event-playbooks";
import type { Event } from "@/types";
import type { CommunicationStrategy } from "@/types/communication-strategy";

const STEPPER_STEPS: CampaignWorkflowStep[] = [
  "plan",
  "artwork",
  "schedule",
  "publish",
  "published",
];

const SHELL_COLORS = {
  activeStepPill: "#F5F0E0",
  campaignCardBg: "#FFFFFF",
  openButtonBg: "#E8DCC8",
  openButtonText: "#1A1A1A",
  strategyPillBg: "#F5F0E0",
  strategyPillText: "#5C4D3C",
  stepComplete: "#006B5D",
} as const;

interface SocialMediaCenterShellProps {
  event: Event;
  artwork?: HeroArtworkSelection | null;
  ownership?: EventRosterOwnership | null;
  communicationStrategy?: CommunicationStrategy;
  activeStep?: CampaignWorkflowStep;
  onStepSelect?: (step: CampaignWorkflowStep) => void;
  metaPublishBundles?: MetaPublishBundle[];
  tasks?: EventPlaybookTask[];
  onCreateMilestone?: () => void;
  /** Defaults to the event workspace page. Use `#overview` from Planning Hub. */
  backHref?: string;
  children: React.ReactNode;
}

function formatChairLabel(
  event: Event,
  ownership: EventRosterOwnership | null | undefined,
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

function strategyLabel(strategy: CommunicationStrategy | undefined): string {
  const match = COMMUNICATION_STRATEGY_OPTIONS.find((option) => option.value === strategy);
  return match?.label ?? "Full campaign";
}

function SocialMediaCenterStepper({
  activeStep,
  onStepSelect,
}: {
  activeStep: CampaignWorkflowStep;
  onStepSelect?: (step: CampaignWorkflowStep) => void;
}) {
  const completedSteps = resolveCompletedWorkflowSteps(activeStep);

  return (
    <nav
      className="flex items-center gap-0 overflow-x-auto border-b px-4 py-3 sm:px-6"
      style={{
        borderColor: MILESTONE_PLANNING_COLORS.border,
        backgroundColor: "#FFFFFF",
      }}
      aria-label="Campaign progress"
    >
      {STEPPER_STEPS.map((step, index) => {
        const isActive = step === activeStep;
        const isComplete = completedSteps.includes(step) && !isActive;
        const stepNumber = index + 1;
        const label = CAMPAIGN_WORKFLOW_STEP_LABELS[step];

        return (
          <div key={step} className="flex shrink-0 items-center">
            {index > 0 && (
              <ChevronRight
                className="mx-1.5 h-3.5 w-3.5 shrink-0"
                style={{ color: MILESTONE_PLANNING_COLORS.border }}
                aria-hidden
              />
            )}
            <button
              type="button"
              onClick={() => onStepSelect?.(step)}
              disabled={!onStepSelect}
              className={cn(
                "flex items-center gap-2 rounded-full px-2 py-1.5 text-left transition-colors sm:px-3",
                !onStepSelect && "cursor-default",
                !isActive && onStepSelect && "hover:opacity-80",
              )}
              style={isActive ? { backgroundColor: SHELL_COLORS.activeStepPill } : undefined}
              aria-current={isActive ? "step" : undefined}
            >
              {isComplete ? (
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: SHELL_COLORS.stepComplete }}
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                </span>
              ) : isActive ? (
                <Sparkles
                  className="h-4 w-4 shrink-0"
                  style={{ color: "#8A7355" }}
                  aria-hidden
                />
              ) : (
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium"
                  style={{
                    borderColor: MILESTONE_PLANNING_COLORS.border,
                    color: "#7A7268",
                    backgroundColor: "#FFFFFF",
                  }}
                >
                  {stepNumber}
                </span>
              )}

              {isActive ? (
                <span className="flex flex-col leading-tight">
                  <span
                    className="text-[10px] font-medium tracking-[0.14em] uppercase"
                    style={{ color: "#7A7268" }}
                  >
                    Step {stepNumber}
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: MILESTONE_PLANNING_COLORS.text }}
                  >
                    {label}
                  </span>
                </span>
              ) : (
                <span
                  className={cn(
                    "whitespace-nowrap text-sm",
                    isComplete ? "font-medium" : "",
                  )}
                  style={{
                    color: isComplete
                      ? MILESTONE_PLANNING_COLORS.text
                      : "#7A7268",
                  }}
                >
                  {label}
                </span>
              )}
            </button>
          </div>
        );
      })}
    </nav>
  );
}

function CampaignSummaryCard({
  event,
  artwork,
  ownership,
  communicationStrategy,
}: {
  event: Event;
  artwork?: HeroArtworkSelection | null;
  ownership?: EventRosterOwnership | null;
  communicationStrategy?: CommunicationStrategy;
}) {
  const showArtwork = hasDisplayableArtwork(artwork ?? null);
  const chairLabel = formatChairLabel(event, ownership);

  return (
    <div
      className="w-full shrink-0 border p-4 sm:w-[17.5rem] lg:absolute lg:top-0 lg:right-0"
      style={{
        borderColor: MILESTONE_PLANNING_COLORS.border,
        backgroundColor: SHELL_COLORS.campaignCardBg,
      }}
    >
      <div className="flex gap-3">
        <div
          className="relative h-14 w-14 shrink-0 overflow-hidden border"
          style={{ borderColor: MILESTONE_PLANNING_COLORS.border }}
        >
          {showArtwork && artwork?.imageUrl ? (
            <Image
              src={artwork.imageUrl}
              alt={artwork.label ?? event.title}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-xs font-medium"
              style={{ backgroundColor: "#F5F0E0", color: "#8A7355" }}
            >
              {event.title.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p
            className="font-display truncate text-base leading-tight"
            style={{ color: MILESTONE_PLANNING_COLORS.text }}
          >
            {event.title}
          </p>
          <p
            className="mt-1 flex items-center gap-1 text-xs"
            style={{ color: "#7A7268" }}
          >
            <Calendar className="h-3 w-3 shrink-0" aria-hidden />
            {formatEventDate(event.date)}
          </p>
          <span
            className="mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{
              backgroundColor: SHELL_COLORS.strategyPillBg,
              color: SHELL_COLORS.strategyPillText,
            }}
          >
            {strategyLabel(communicationStrategy)}
          </span>
        </div>
      </div>

      <div
        className="mt-3 flex items-center justify-between gap-2 border-t pt-3"
        style={{ borderColor: MILESTONE_PLANNING_COLORS.border }}
      >
        <p
          className="flex min-w-0 items-center gap-1.5 truncate text-xs"
          style={{ color: "#7A7268" }}
        >
          <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            Chair: <span style={{ color: MILESTONE_PLANNING_COLORS.text }}>{chairLabel}</span>
          </span>
        </p>
        <Link
          href={`/events/${event.id}`}
          className="inline-flex h-7 shrink-0 items-center justify-center px-3 text-xs font-medium transition-opacity hover:opacity-80"
          style={{
            backgroundColor: SHELL_COLORS.openButtonBg,
            color: SHELL_COLORS.openButtonText,
          }}
        >
          Open
        </Link>
      </div>
    </div>
  );
}

export function SocialMediaCenterShell({
  event,
  artwork = null,
  ownership = null,
  communicationStrategy,
  activeStep = "plan",
  onStepSelect,
  metaPublishBundles = [],
  tasks = [],
  onCreateMilestone,
  backHref,
  children,
}: SocialMediaCenterShellProps) {
  const resolvedBackHref = backHref ?? `/events/${event.id}`;

  return (
    <div
      className="overflow-hidden"
      style={{ backgroundColor: MILESTONE_PLANNING_COLORS.pageBg }}
    >
      <div className="px-4 pt-5 sm:px-6 lg:px-8">
        <Link
          href={resolvedBackHref}
          className="inline-flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-80"
          style={{ color: "#7A7268" }}
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to campaign
        </Link>

        <div className="relative mt-4 lg:pr-[19rem]">
          <div className="min-w-0 max-w-2xl">
            <h1
              className="font-display text-3xl sm:text-[2.25rem] sm:leading-tight"
              style={{ color: MILESTONE_PLANNING_COLORS.text }}
            >
              Social Media Center
            </h1>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "#7A7268" }}>
              Plan, create, and schedule content that connects and inspires.
            </p>
          </div>

          <div className="mt-4 lg:mt-0">
            <CampaignSummaryCard
              event={event}
              artwork={artwork}
              ownership={ownership}
              communicationStrategy={communicationStrategy}
            />
          </div>
        </div>
      </div>

      <div className="mt-5">
        <SocialMediaCenterStepper activeStep={activeStep} onStepSelect={onStepSelect} />
      </div>

      <div className="grid gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[1fr_17.5rem] lg:gap-6 lg:px-8 lg:py-6">
        <div className="min-w-0">{children}</div>
        <SocialMediaCenterSidebar
          eventId={event.id}
          tasks={tasks}
          metaPublishBundles={metaPublishBundles}
          onCreateMilestone={onCreateMilestone}
        />
      </div>
    </div>
  );
}
