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

/** Shared main/sidebar column ratio — matches planning hub mockup (~65% / ~35%). */
const STUDIO_GRID_CLASS =
  "lg:grid-cols-[minmax(0,65fr)_minmax(0,35fr)] lg:gap-x-6";

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
      className="flex items-center gap-0 overflow-x-auto bg-cos-card py-3"
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
  className,
}: {
  event: Event;
  artwork?: HeroArtworkSelection | null;
  ownership?: EventRosterOwnership | null;
  communicationStrategy?: CommunicationStrategy;
  className?: string;
}) {
  const showArtwork = hasDisplayableArtwork(artwork ?? null);
  const chairLabel = formatChairLabel(event, ownership);

  return (
    <div className={cn("flex shrink-0 bg-cos-card shadow-sm", className)}>
      <div className="relative w-1/2 shrink-0 self-stretch overflow-hidden">
        {showArtwork && artwork?.imageUrl ? (
          <Image
            src={artwork.imageUrl}
            alt={artwork.label ?? event.title}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full min-h-[7.5rem] w-full items-center justify-center bg-cos-warning text-sm font-medium text-cos-warning-text">
            {event.title.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between p-4">
        <div>
          <p className="font-display line-clamp-2 text-lg leading-snug text-cos-text">
            {event.title}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="flex items-center gap-1 text-xs text-cos-muted">
              <Calendar className="h-3 w-3 shrink-0" aria-hidden />
              {formatEventDate(event.date)}
            </p>
            <span className="inline-flex rounded-full bg-cos-warning px-2 py-0.5 text-[10px] font-medium text-cos-warning-text">
              {strategyLabel(communicationStrategy)}
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="flex min-w-0 items-center gap-1.5 text-xs text-cos-muted">
            <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="min-w-0 truncate">
              Chair: <span className="text-cos-text">{chairLabel}</span>
            </span>
          </p>
          <Link
            href={`/events/${event.id}`}
            className="inline-flex h-8 shrink-0 items-center justify-center bg-cos-accent-soft px-4 text-xs font-medium text-cos-text transition-opacity hover:opacity-80"
          >
            Open
          </Link>
        </div>
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
    <div className="-mx-4 overflow-hidden bg-cos-bg lg:-mx-8">
      <div className="px-5 pt-5 pb-6 lg:px-6">
        <Link
          href={resolvedBackHref}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-cos-muted transition-opacity hover:text-cos-text"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to campaign
        </Link>

        <div className={cn("mt-4 grid gap-4 lg:items-stretch", STUDIO_GRID_CLASS)}>
          <div className="flex min-w-0 flex-col items-start justify-center">
            <h1 className="font-display text-3xl text-cos-text sm:text-[2.25rem] sm:leading-tight">
              Creative Studio
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-cos-muted">
              Plan, create, and schedule content that connects and inspires.
            </p>
          </div>

          <div className="flex min-w-0 items-center justify-end">
            <CampaignSummaryCard
              event={event}
              artwork={artwork}
              ownership={ownership}
              communicationStrategy={communicationStrategy}
              className="w-full max-w-sm"
            />
          </div>
        </div>

        <div className="mt-4 border-y border-cos-border">
          <SocialMediaCenterStepper activeStep={activeStep} onStepSelect={onStepSelect} />
        </div>

        <div className={cn("mt-5 grid gap-5 lg:items-start", STUDIO_GRID_CLASS)}>
          <div className="min-w-0">{children}</div>
          <SocialMediaCenterSidebar
            eventId={event.id}
            tasks={tasks}
            metaPublishBundles={metaPublishBundles}
            onCreateMilestone={onCreateMilestone}
          />
        </div>
      </div>
    </div>
  );
}
