import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readSrc(relativeFromTest: string): string {
  return readFileSync(new URL(relativeFromTest, import.meta.url), "utf8");
}

describe("event detail ease UI contracts", () => {
  const shell = readSrc(
    "../../../components/events-phase3/EventDetailShell.tsx",
  );
  const planningHub = readSrc(
    "../../../app/(dashboard)/events/[id]/render-planning-hub.tsx",
  );

  it("uses workspace overview default with Planning/Community top-level nav", () => {
    assert.match(shell, /EventWorkspaceOverviewPanel/);
    assert.match(shell, /EventWorkspaceContextHeader/);
    assert.match(shell, /EventPlanningShell/);
    assert.match(shell, /EventCommunityPanel/);
    assert.match(shell, /role="tablist"/);
    assert.match(shell, /Planning/);
    assert.match(shell, /Community/);
    assert.match(shell, /responsibilities: "Team"/);
    assert.match(shell, /PLANNING_TABS/);
    assert.match(shell, /COMMUNITY_TABS/);
    assert.match(shell, /return "overview"/);
    assert.doesNotMatch(shell, /EventDetailEaseHero/);
    assert.doesNotMatch(shell, /<EventDetailHero[\s>]/);
  });

  it("renders mockup-faithful ease panels for every tab (no hub blend)", () => {
    assert.match(shell, /EventDetailApprovalsEasePanel/);
    assert.match(shell, /EventDetailTasksEasePanel/);
    assert.match(shell, /EventDetailCreateWithAiPanel/);
    assert.match(shell, /EventDetailVolunteersEasePanel/);
    assert.match(shell, /EventDetailInsightsEasePanel/);
    assert.match(shell, /EventCommunityPanel/);
    assert.match(shell, /EventDetailNotesEasePanel/);
    assert.match(shell, /EventDetailFilesEasePanel/);
    assert.match(shell, /EventDetailActivityEasePanel/);

    assert.doesNotMatch(shell, /ApprovalsSchedulingHub/);
    assert.doesNotMatch(shell, /TasksV2Shell/);
    assert.doesNotMatch(shell, /EventVolunteersTab/);
    assert.doesNotMatch(shell, /EventInsightsTab/);
    assert.doesNotMatch(shell, /<FilesTab[\s>]/);
    assert.doesNotMatch(shell, /<NotesTab[\s>]/);
    assert.doesNotMatch(shell, /EventVendorsSection/);
  });

  it("ships Pilot Event Task List with Ask AI, New Task, and shared list", () => {
    const panel = readSrc(
      "../../../components/events-phase3/EventDetailTasksEasePanel.tsx",
    );
    assert.match(panel, /Task List/);
    assert.match(panel, /Ask AI for tasks/);
    assert.match(panel, /\+ New Task/);
    assert.match(panel, /TasksEaseList/);
    assert.match(panel, /hideEventColumn/);
    assert.match(panel, /TasksEaseAskAi/);
    assert.match(panel, /TasksEaseAddTaskModal/);
    assert.match(panel, /lockEventId=\{eventId\}/);
    assert.match(panel, /setTasksEaseStorageScope/);
    assert.match(panel, /event-tasks-empty/);
    assert.doesNotMatch(panel, /Needs you next/);
    assert.doesNotMatch(panel, /EaseFocusCard/);
  });

  it("event Approvals ease panel uses visual content cards and review drawer", () => {
    const panel = readSrc(
      "../../../components/events-phase3/EventDetailApprovalsEasePanel.tsx",
    );
    assert.match(panel, /Needs Your Review/);
    assert.match(panel, /All Event Content/);
    assert.match(panel, /Everything reviewed/);
    assert.match(panel, /No content yet/);
    assert.match(panel, /ReviewDrawer/);
    assert.match(panel, /RequestChangesModal/);
    assert.match(panel, /approveUnifiedItemAction/);
    assert.doesNotMatch(panel, /EaseListRail/);
    assert.doesNotMatch(panel, /EasePulseMini/);
    assert.doesNotMatch(panel, /APPROVALS_EASE_PULSE_OPTIONS/);
  });

  it("keeps Create with AI as an in-page doorway", () => {
    assert.match(shell, /EventDetailCreateWithAiPanel/);
    assert.doesNotMatch(shell, /window\.location\.replace\(createWithAiUrl\)/);
  });

  it("ships Volunteers Coverage/People/Items with Arrived/Received and no email", () => {
    const panel = readSrc(
      "../../../components/events-phase3/EventDetailVolunteersEasePanel.tsx",
    );
    const roster = readSrc(
      "../../../components/events-phase3/EventVolunteerRosterEase.tsx",
    );
    assert.match(panel, /EventVolunteerRosterEase/);
    assert.match(panel, /getEventVolunteerOverviewAction/);
    assert.match(panel, /EventVolunteersTab/);
    assert.match(panel, /No Signup Connected/);
    assert.match(panel, /Connect SignupGenius/);
    assert.match(roster, /Coverage/);
    assert.match(roster, /People/);
    assert.match(roster, /Items/);
    assert.match(roster, /Mark Arrived/);
    assert.match(roster, /Mark Received/);
    assert.match(roster, /Volunteers Fully Staffed/);
    assert.match(roster, /toggleEventVolunteerOpAction/);
    assert.match(roster, /title="Open signup"/);
    assert.doesNotMatch(roster, /Send Urgent Invite/);
    assert.doesNotMatch(roster, /\b[Ee]mail\b/);
    assert.doesNotMatch(panel, /\b[Ee]mail\b/);
  });

  it("normalizes legacy publishing artwork and approval payloads", () => {
    assert.match(planningHub, /function normalizeMetaPublishBundles/);
    assert.match(planningHub, /filter\(\(bundle\).*Boolean\(bundle\)/);
    assert.match(planningHub, /feedArtworkUrl: bundle\.feedArtworkUrl \?\? null/);
    assert.match(planningHub, /storyArtworkUrl: bundle\.storyArtworkUrl \?\? null/);
    assert.match(planningHub, /const approvalRequests = resolvedWorkspace\.approvalRequests \?\? \[\]/);
  });

  it("ships overview landing + condensed context header for non-overview tabs", () => {
    const overview = readSrc(
      "../../../components/events-phase3/EventWorkspaceOverviewPanel.tsx",
    );
    const header = readSrc(
      "../../../components/events-phase3/EventWorkspaceContextHeader.tsx",
    );
    const notes = readSrc(
      "../../../components/events-phase3/EventDetailNotesEasePanel.tsx",
    );

    assert.match(overview, /What Needs Your Attention/);
    assert.match(overview, /Generate Event Plan/);
    assert.match(overview, /createWithAiHref/);
    assert.match(overview, /Event Workspace/);
    assert.match(header, /Back to Workspace/);
    assert.match(header, /Back to Events/);
    assert.match(header, /includeEditDetails/);
    assert.match(header, /iconOnly/);
    assert.match(shell, /onBackToWorkspace/);
    assert.match(notes, /Shared Notes/);
    assert.match(notes, /Recent Scratchpads/);
    assert.match(notes, /New Note/);
    assert.match(notes, /note-paper|repeating-linear-gradient/);
    assert.match(notes, /deleteEventPlaybookNoteAction/);
    assert.match(notes, /Trash2/);
    assert.match(notes, /window\.confirm/);
    assert.doesNotMatch(notes, /localStorage/);
  });
});
