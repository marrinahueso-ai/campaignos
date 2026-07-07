"use client";

import { PlanningHubAiInsights } from "@/components/event-playbooks/planning-hub/PlanningHubAiInsights";
import { PlanningHubCampaignGlance } from "@/components/event-playbooks/planning-hub/PlanningHubCampaignGlance";
import { PlanningHubContextBar } from "@/components/event-playbooks/planning-hub/PlanningHubContextBar";
import { PlanningHubHeader } from "@/components/event-playbooks/planning-hub/PlanningHubHeader";
import { PlanningHubKpiRow } from "@/components/event-playbooks/planning-hub/PlanningHubKpiRow";
import { PlanningHubMyTasks } from "@/components/event-playbooks/planning-hub/PlanningHubMyTasks";
import { PlanningHubQuickLinks } from "@/components/event-playbooks/planning-hub/PlanningHubQuickLinks";
import { PlanningHubSocialCenter } from "@/components/event-playbooks/planning-hub/PlanningHubSocialCenter";
import { PlanningHubVolunteerInfo } from "@/components/event-playbooks/planning-hub/PlanningHubVolunteerInfo";
import { PlanningHubPage } from "@/components/event-playbooks/planning-hub/PlanningHubPrimitives";
import type { EventPlaybookTab } from "@/components/event-playbooks/EventPlaybookTabs";
import type { CampaignWorkflowStep } from "@/components/event-workspace/CampaignWorkspaceTabs";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import type { AiAssistantStatus } from "@/lib/ai";
import type { MetaPublishBundle } from "@/lib/meta-publishing/types";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";
import type { EventPlaybookHubData } from "@/types/event-playbooks";
import type { Event } from "@/types";

interface PlanningHubDashboardProps {
  event: Event;
  ownership: EventRosterOwnership | null;
  hubData: EventPlaybookHubData;
  artwork: HeroArtworkSelection | null;
  hasCampaign: boolean;
  metaPublishBundles?: MetaPublishBundle[];
  committeePersonOptions?: string[];
  defaultCommitteePerson?: string;
  greetingName: string;
  campaignEvents: Event[];
  notificationCount: number;
  userEmail?: string | null;
  aiStatus: AiAssistantStatus;
  pastLessonCount: number;
  tablesAvailable: boolean;
  onNavigateTab: (tab: EventPlaybookTab, step?: CampaignWorkflowStep) => void;
}

export function PlanningHubDashboard({
  event,
  ownership,
  hubData,
  artwork,
  hasCampaign,
  metaPublishBundles = [],
  committeePersonOptions = [],
  defaultCommitteePerson = "",
  greetingName,
  campaignEvents,
  notificationCount,
  userEmail,
  aiStatus,
  pastLessonCount,
  tablesAvailable,
  onNavigateTab,
}: PlanningHubDashboardProps) {
  const totalTaskCount = hubData.tasks.length;
  const doneTaskCount = hubData.tasks.filter((task) => task.status === "done").length;
  const lessonCount = hubData.notes.filter((note) => note.noteType === "lesson").length;
  const planningNoteCount = hubData.notes.filter((note) => note.noteType === "note").length;

  return (
    <PlanningHubPage>
      <PlanningHubContextBar
        notificationCount={notificationCount}
        greetingName={greetingName}
        userEmail={userEmail}
      />

      <PlanningHubHeader
        event={event}
        campaignEvents={campaignEvents}
        onNavigateTab={onNavigateTab}
      />

      <PlanningHubKpiRow
        event={event}
        taskProgressPercent={hubData.planningProgressPercent}
        doneTaskCount={doneTaskCount}
        totalTaskCount={totalTaskCount}
        onNavigateTab={onNavigateTab}
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <PlanningHubCampaignGlance
            event={event}
            ownership={ownership}
            artwork={artwork}
            committeePersonOptions={committeePersonOptions}
            defaultCommitteePerson={defaultCommitteePerson}
            onNavigateTab={onNavigateTab}
          />
        </div>
        <div className="xl:col-span-3">
          <PlanningHubQuickLinks
            event={event}
            hasCampaign={hasCampaign}
            onNavigateTab={onNavigateTab}
          />
        </div>
        <div className="xl:col-span-4">
          <PlanningHubSocialCenter
            bundles={metaPublishBundles}
            hasCampaign={hasCampaign}
            onNavigateTab={onNavigateTab}
          />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <PlanningHubMyTasks
          eventId={event.id}
          tasks={hubData.tasks}
          tablesAvailable={tablesAvailable}
          onNavigateTab={onNavigateTab}
        />
        <PlanningHubVolunteerInfo event={event} onNavigateTab={onNavigateTab} />
        <PlanningHubAiInsights
          eventId={event.id}
          aiStatus={aiStatus}
          lessonCount={lessonCount}
          planningNoteCount={planningNoteCount}
          pastLessonCount={pastLessonCount}
          tablesAvailable={tablesAvailable}
          onNavigateTab={onNavigateTab}
        />
      </div>
    </PlanningHubPage>
  );
}
