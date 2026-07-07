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
      className="flex items-center gap-0 overflow-x-auto border-b border-cos-border bg-cos-card px-4 py-3 sm:px-6"
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
                className="mx-1.5 h-3.5 w-3.5 shrink-0 text-cos-border"
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
                isActive && "bg-cos-warning",
                !isActive && onStepSelect && "hover:opacity-80",
              )}
              aria-current={isActive ? "step" : undefined}
            >
              {isComplete ? (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cos-success text-white">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                </span>
              ) : isActive ? (
                <Sparkles className="h-4 w-4 shrink-0 text-cos-accent" aria-hidden />
              ) : (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cos-border bg-cos-card text-xs font-medium text-cos-muted">
                  {stepNumber}
                </span>
              )}

              {isActive ? (
                <span className="flex flex-col leading-tight">
                  <span className="text-[10px] font-medium tracking-[0.14em] text-cos-muted uppercase">
                    Step {stepNumber}
                  </span>
                  <span className="text-sm font-medium text-cos-text">{label}</span>
                </span>
              ) : (
                <span
                  className={cn(
                    "whitespace-nowrap text-sm",
                    isComplete ? "font-medium text-cos-text" : "text-cos-muted",
                  )}
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
    <div className="w-full shrink-0 border border-cos-border bg-cos-card p-4 sm:w-[17.5rem] lg:absolute lg:top-0 lg:right-0">
      <div className="flex gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden border border-cos-border">
          {showArtwork && artwork?.imageUrl ? (
            <Image
              src={artwork.imageUrl}
              alt={artwork.label ?? event.title}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-cos-warning text-xs font-medium text-cos-warning-text">
              {event.title.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-display truncate text-base leading-tight text-cos-text">
            {event.title}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-cos-muted">
            <Calendar className="h-3 w-3 shrink-0" aria-hidden />
            {formatEventDate(event.date)}
          </p>
          <span className="mt-1.5 inline-flex rounded-full bg-cos-warning px-2 py-0.5 text-[10px] font-medium text-cos-warning-text">
            {strategyLabel(communicationStrategy)}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-cos-border pt-3">
        <p className="flex min-w-0 items-center gap-1.5 truncate text-xs text-cos-muted">
          <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            Chair: <span className="text-cos-text">{chairLabel}</span>
          </span>
        </p>
        <Link
          href={`/events/${event.id}`}
          className="inline-flex h-7 shrink-0 items-center justify-center bg-cos-accent-soft px-3 text-xs font-medium text-cos-text transition-opacity hover:opacity-80"
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
    <div className="overflow-hidden bg-cos-bg">
      <div className="px-4 pt-5 sm:px-6 lg:px-8">
        <Link
          href={resolvedBackHref}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-cos-muted transition-opacity hover:text-cos-text"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to campaign
        </Link>

        <div className="relative mt-4 lg:pr-[19rem]">
          <div className="min-w-0 max-w-2xl">
            <h1 className="font-display text-3xl text-cos-text sm:text-[2.25rem] sm:leading-tight">
              Social Media Center
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-cos-muted">
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
