"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { MilestonePlanningContextSelectors } from "@/components/event-workspace/plan/MilestonePlanningContextSelectors";
import type { MilestonePlanningVpRoleOption } from "@/lib/event-workspace/plan/milestone-planning-context-utils";
import type { Event } from "@/types";
import type { CommunicationPlaybook } from "@/types/playbooks";

interface MilestonePlanningPageHeaderProps {
  eventId: string;
  event: Event;
  playbookId: string;
  availablePlaybooks: CommunicationPlaybook[];
  vpRoles: MilestonePlanningVpRoleOption[];
  defaultVpRoleId: string;
  committeePersonOptions: string[];
  defaultCommitteePerson: string;
  onSavePlan?: () => void;
  isSaving?: boolean;
  saveDisabled?: boolean;
}

export function MilestonePlanningPageHeader({
  eventId,
  event,
  playbookId,
  availablePlaybooks,
  vpRoles,
  defaultVpRoleId,
  committeePersonOptions,
  defaultCommitteePerson,
  onSavePlan,
  isSaving = false,
  saveDisabled = false,
}: MilestonePlanningPageHeaderProps) {
  return (
    <div className="space-y-5">
      <Link
        href={`/events/${eventId}`}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-cos-muted transition-colors hover:text-cos-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to campaign
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 max-w-2xl">
          <p className="text-[0.6875rem] font-medium tracking-[0.18em] text-cos-muted uppercase">
            Social media
          </p>
          <h1 className="font-display mt-1.5 text-3xl text-cos-text sm:text-[2.25rem] sm:leading-tight">
            Milestone planning
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-cos-muted">
            Plan and customize each social media milestone for this campaign. Add, remove, or
            reorder milestones to match your strategy.
          </p>
          <MilestonePlanningContextSelectors
            event={event}
            playbookId={playbookId}
            availablePlaybooks={availablePlaybooks}
            vpRoles={vpRoles}
            defaultVpRoleId={defaultVpRoleId}
            committeePersonOptions={committeePersonOptions}
            defaultCommitteePerson={defaultCommitteePerson}
          />
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href={`/events/${eventId}`}
            className="inline-flex h-9 items-center justify-center gap-2 border border-cos-border bg-cos-card px-4 text-xs font-medium text-cos-text transition-colors hover:bg-cos-bg"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            View campaign
          </Link>
          <button
            type="button"
            onClick={onSavePlan}
            disabled={saveDisabled || isSaving}
            className="inline-flex h-9 items-center justify-center bg-cos-text px-4 text-xs font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save plan"}
          </button>
        </div>
      </div>
    </div>
  );
}
