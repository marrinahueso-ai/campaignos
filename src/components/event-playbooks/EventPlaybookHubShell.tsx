"use client";

import {
  EventPlaybookTabs,
  type CampaignWorkflowStep,
  type EventPlaybookTab,
} from "@/components/event-playbooks/EventPlaybookTabs";
import { OverviewTab } from "@/components/event-playbooks/OverviewTab";
import { TasksTab } from "@/components/event-playbooks/TasksTab";
import { NotesTab } from "@/components/event-playbooks/NotesTab";
import { FilesTab } from "@/components/event-playbooks/FilesTab";
import { AIInsightsTab } from "@/components/event-playbooks/AIInsightsTab";
import { SettingsTab } from "@/components/event-playbooks/SettingsTab";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import type { AiAssistantStatus } from "@/lib/ai";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import type { EventPlaybookHubData } from "@/types/event-playbooks";
import type { FilesPageData } from "@/types/campaign-files";
import type { Event } from "@/types";

interface EventPlaybookHubShellProps {
  event: Event;
  artwork: HeroArtworkSelection | null;
  ownership: EventRosterOwnership | null;
  hubData: EventPlaybookHubData;
  filesPageData: FilesPageData;
  pastLessonCount: number;
  aiStatus: AiAssistantStatus;
  tablesAvailable: boolean;
  taskGroupsAvailable?: boolean;
  hasCampaign: boolean;
  socialMedia: React.ReactNode | null;
  calendarSettingsExtras?: React.ReactNode;
  initialCampaignStep?: CampaignWorkflowStep;
  onCampaignStepChange?: (step: CampaignWorkflowStep) => void;
  defaultTab?: EventPlaybookTab;
  committeePersonOptions?: string[];
  defaultCommitteePerson?: string;
  metaPublishBundles?: MetaPublishBundle[];
  greetingName: string;
  timezone?: string;
  campaignEvents: Event[];
  notificationCount: number;
  userEmail?: string | null;
}

export function EventPlaybookHubShell({
  event,
  artwork,
  ownership,
  hubData,
  filesPageData,
  pastLessonCount,
  aiStatus,
  tablesAvailable,
  taskGroupsAvailable = true,
  hasCampaign,
  socialMedia,
  calendarSettingsExtras,
  initialCampaignStep = "plan",
  onCampaignStepChange,
  defaultTab = "overview",
  committeePersonOptions = [],
  defaultCommitteePerson = "",
  metaPublishBundles = [],
  greetingName,
  timezone,
  campaignEvents,
  notificationCount,
  userEmail,
}: EventPlaybookHubShellProps) {
  const lessonCount = hubData.notes.filter((note) => note.noteType === "lesson").length;
  const planningNoteCount = hubData.notes.filter((note) => note.noteType === "note").length;

  return (
    <EventPlaybookTabs
      hasCampaign={hasCampaign}
      initialCampaignStep={initialCampaignStep}
      onCampaignStepChange={onCampaignStepChange}
      defaultTab={defaultTab}
      overview={(navigateToTab) => (
        <OverviewTab
          event={event}
          ownership={ownership}
          hubData={hubData}
          artwork={artwork}
          hasCampaign={hasCampaign}
          tablesAvailable={tablesAvailable}
          metaPublishBundles={metaPublishBundles}
          committeePersonOptions={committeePersonOptions}
          defaultCommitteePerson={defaultCommitteePerson}
          greetingName={greetingName}
          timezone={timezone}
          campaignEvents={campaignEvents}
          notificationCount={notificationCount}
          userEmail={userEmail}
          aiStatus={aiStatus}
          pastLessonCount={pastLessonCount}
          onNavigateTab={navigateToTab}
        />
      )}
      tasks={
        <TasksTab
          eventId={event.id}
          tasks={hubData.tasks}
          taskGroups={hubData.taskGroups}
          tablesAvailable={tablesAvailable}
          taskGroupsAvailable={taskGroupsAvailable}
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
        <FilesTab eventId={event.id} data={filesPageData} />
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
  );
}
