import { EventDetailPhase3Client } from "@/components/events-phase3/EventDetailPhase3Client";
import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { getAuthUser } from "@/lib/auth/queries";
import { areEventPlaybookTablesAvailable } from "@/lib/event-playbooks/queries";
import { loadEventWorkspaceShellPayload } from "@/lib/events-phase3/workspace-shell";
import { loadEventDetailTabData } from "@/lib/events-phase3/tab-loaders";
import type { Event } from "@/types";

export async function renderEventsPhase3Detail(
  event: Event,
  initialTab: string | null,
  options?: { showYoureSet?: boolean },
) {
  const shell = await loadEventWorkspaceShellPayload(event);

  // Default tab is Overview (no SSR tab payload). Approvals and other panels
  // load via the client tab action. SSR-streaming Approvals forced k6 (and every
  // bare event GET) to wait on the full approvals query+DTO — Overview + shell
  // paint first. Deep links still preload the requested non-default tabs.
  const lazyInitial =
    initialTab === "tasks" ||
    initialTab === "files" ||
    initialTab === "notes" ||
    initialTab === "vendors" ||
    initialTab === "activity" ||
    initialTab === "insights"
      ? initialTab
      : null;

  let initialWorkspace: import("@/components/events-phase3/EventDetailShell").EventDetailWorkspacePanels =
    {};

  if (lazyInitial != null) {
    const [user, membership, campaignRole, tablesAvailable] = await Promise.all([
      getAuthUser(),
      getActiveMembership(),
      getCurrentCampaignRole(),
      areEventPlaybookTablesAvailable(),
    ]);

    if (user && membership) {
      const data = await loadEventDetailTabData(lazyInitial, {
        user,
        membership,
        organizationId: membership.organizationId,
        event,
        campaignRole,
        tablesAvailable,
      });

      switch (data.tab) {
        case "tasks":
          initialWorkspace = { tasksV2Data: data.tasksV2Data };
          break;
        case "files":
          initialWorkspace = { filesPageData: data.filesPageData };
          break;
        case "notes":
          initialWorkspace = {
            notes: data.notes,
            tablesAvailable: data.tablesAvailable,
          };
          break;
        case "vendors":
          initialWorkspace = {
            eventVendorsData: data.eventVendorsData,
            vendorDirectory: data.vendorDirectory,
          };
          break;
        case "activity":
          initialWorkspace = {
            playbookActivity: data.playbookActivity,
            workspaceTimeline: data.workspaceTimeline,
          };
          break;
        case "insights":
          initialWorkspace = {
            insightsData: data.insightsData,
          };
          break;
      }
    }
  }

  return (
    <EventDetailPhase3Client
      event={shell.event}
      artwork={shell.artwork}
      playbookName={shell.playbookName}
      responsibilities={shell.responsibilities}
      approvalFlow={shell.approvalFlow}
      heroStats={shell.heroStats}
      canManageAssignments={shell.canManageAssignments}
      workspace={initialWorkspace}
      approvalsSlot={undefined}
      initialTab={initialTab}
      showYoureSet={Boolean(options?.showYoureSet)}
      committeeId={shell.committeeId}
      committeeName={shell.committeeName}
      navigationMode="event-detail"
    />
  );
}
