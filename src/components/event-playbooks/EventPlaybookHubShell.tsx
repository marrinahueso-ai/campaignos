"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import {
  EventPlaybookTabs,
  type CampaignWorkflowStep,
} from "@/components/event-playbooks/EventPlaybookTabs";
import { OverviewTab } from "@/components/event-playbooks/OverviewTab";
import { TasksTab } from "@/components/event-playbooks/TasksTab";
import { NotesTab } from "@/components/event-playbooks/NotesTab";
import { FilesTab } from "@/components/event-playbooks/FilesTab";
import { AIInsightsTab } from "@/components/event-playbooks/AIInsightsTab";
import { SettingsTab } from "@/components/event-playbooks/SettingsTab";
import { EventHeroArtwork } from "@/components/event-workspace/EventHeroArtwork";
import { CommunicationStrategyBadge } from "@/components/events/CommunicationStrategyBadge";
import { EventOwnershipStrip } from "@/components/events/EventOwnershipStrip";
import { hasDisplayableArtwork } from "@/lib/event-workspace/has-displayable-artwork";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import type { AiAssistantStatus } from "@/lib/ai";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import { formatEventDate, formatEventTime } from "@/lib/utils/dates";
import type { Event } from "@/types";
import type { EventPlaybookHubData } from "@/types/event-playbooks";

interface EventPlaybookHubShellProps {
  event: Event;
  artwork: HeroArtworkSelection | null;
  ownership: EventRosterOwnership | null;
  hubData: EventPlaybookHubData;
  pastEvents: Event[];
  pastLessonCount: number;
  aiStatus: AiAssistantStatus;
  tablesAvailable: boolean;
  hasCampaign: boolean;
  socialMedia: React.ReactNode | null;
  calendarSettingsExtras?: React.ReactNode;
  initialCampaignStep?: CampaignWorkflowStep;
  onCampaignStepChange?: (step: CampaignWorkflowStep) => void;
}

export function EventPlaybookHubShell({
  event,
  artwork,
  ownership,
  hubData,
  pastEvents,
  pastLessonCount,
  aiStatus,
  tablesAvailable,
  hasCampaign,
  socialMedia,
  calendarSettingsExtras,
  initialCampaignStep = "plan",
  onCampaignStepChange,
}: EventPlaybookHubShellProps) {
  const formattedTime = formatEventTime(event.time);
  const showArtwork = hasDisplayableArtwork(artwork);
  const lessonCount = hubData.notes.filter((n) => n.noteType === "lesson").length;
  const planningNoteCount = hubData.notes.filter((n) => n.noteType === "note").length;

  return (
    <div className="space-y-8">
      <header className="space-y-4 border-b border-cos-border pb-8">
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wide text-cos-muted transition-colors hover:text-cos-text"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to campaigns
        </Link>

        <div
          className={
            showArtwork
              ? "grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-6"
              : undefined
          }
        >
          <div className="min-w-0">
            <p className="studio-eyebrow">Planning hub</p>
            <h1 className="font-display mt-2 text-4xl text-cos-text sm:text-5xl">
              {event.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-cos-muted">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                {formatEventDate(event.date)}
                {formattedTime ? ` · ${formattedTime}` : ""}
              </span>
              {event.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {event.location}
                </span>
              )}
              <CommunicationStrategyBadge strategy={event.communicationStrategy} />
            </div>
          </div>

          {showArtwork && (
            <EventHeroArtwork
              artwork={artwork}
              eventTitle={event.title}
              size="hub"
            />
          )}
        </div>

        {ownership && (
          <div className="mt-4">
            <EventOwnershipStrip ownership={ownership} />
          </div>
        )}
      </header>

      <EventPlaybookTabs
        hasCampaign={hasCampaign}
        initialCampaignStep={initialCampaignStep}
        onCampaignStepChange={onCampaignStepChange}
        overview={
          <OverviewTab
            event={event}
            eventId={event.id}
            ownership={ownership}
            hubData={hubData}
            pastEvents={pastEvents}
            hasCampaign={hasCampaign}
            tablesAvailable={tablesAvailable}
          />
        }
        tasks={
          <TasksTab
            eventId={event.id}
            tasks={hubData.tasks}
            tablesAvailable={tablesAvailable}
          />
        }
        notes={
          <NotesTab
            eventId={event.id}
            notes={hubData.notes}
            tablesAvailable={tablesAvailable}
          />
        }
        files={
          <FilesTab
            eventId={event.id}
            files={hubData.files}
            tablesAvailable={tablesAvailable}
          />
        }
        socialMedia={socialMedia}
        aiInsights={
          <AIInsightsTab
            eventId={event.id}
            eventTitle={event.title}
            eventType={event.eventType}
            aiStatus={aiStatus}
            tasks={hubData.tasks}
            lessonCount={lessonCount}
            planningNoteCount={planningNoteCount}
            pastLessonCount={pastLessonCount}
            tablesAvailable={tablesAvailable}
          />
        }
        settings={
          <SettingsTab
            event={event}
            ownership={ownership}
            hasCampaign={hasCampaign}
            calendarExtras={calendarSettingsExtras}
          />
        }
      />
    </div>
  );
}
