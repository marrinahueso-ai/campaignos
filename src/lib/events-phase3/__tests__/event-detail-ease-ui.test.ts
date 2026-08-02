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

  it("uses ease hero and grouped Planning/Community tabs", () => {
    assert.match(shell, /EventDetailEaseHero/);
    assert.match(shell, /role="tablist"/);
    assert.match(shell, /Planning/);
    assert.match(shell, /Community/);
    assert.match(shell, /responsibilities: "Team"/);
    assert.match(shell, /PLANNING_TABS/);
    assert.match(shell, /COMMUNITY_TABS/);
    assert.doesNotMatch(shell, /<EventDetailHero[\s>]/);
  });

  it("renders mockup-faithful ease panels for every tab (no hub blend)", () => {
    assert.match(shell, /EventDetailApprovalsEasePanel/);
    assert.match(shell, /EventDetailTasksEasePanel/);
    assert.match(shell, /EventDetailCreateWithAiPanel/);
    assert.match(shell, /EventDetailVolunteersEasePanel/);
    assert.match(shell, /EventDetailInsightsEasePanel/);
    assert.match(shell, /EventDetailTeamEasePanel/);
    assert.match(shell, /EventDetailNotesEasePanel/);
    assert.match(shell, /EventDetailFilesEasePanel/);
    assert.match(shell, /EventDetailVendorsEasePanel/);
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

  it("event Approvals ease panel uses sort rail instead of pulse filters", () => {
    const panel = readSrc(
      "../../../components/events-phase3/EventDetailApprovalsEasePanel.tsx",
    );
    const pulse = readSrc(
      "../../approvals-scheduling/approvals-ease-pulse.ts",
    );
    assert.doesNotMatch(panel, /EasePulseMini/);
    assert.doesNotMatch(panel, /APPROVALS_EASE_PULSE_OPTIONS/);
    assert.match(panel, /EVENT_APPROVALS_EASE_SORT_OPTIONS/);
    assert.match(panel, /EaseListRail/);
    assert.match(pulse, /Needs you/);
    assert.match(pulse, /Scheduled/);
    assert.match(pulse, /Posted/);
    assert.doesNotMatch(pulse, /label: "Drafts"/);
    assert.doesNotMatch(panel, /label: "Drafts"/);
  });

  it("keeps Create with AI as an in-page doorway", () => {
    assert.match(shell, /EventDetailCreateWithAiPanel/);
    assert.doesNotMatch(shell, /window\.location\.replace\(createWithAiUrl\)/);
  });

  it("normalizes legacy publishing artwork and approval payloads", () => {
    assert.match(planningHub, /function normalizeMetaPublishBundles/);
    assert.match(planningHub, /filter\(\(bundle\).*Boolean\(bundle\)/);
    assert.match(planningHub, /feedArtworkUrl: bundle\.feedArtworkUrl \?\? null/);
    assert.match(planningHub, /storyArtworkUrl: bundle\.storyArtworkUrl \?\? null/);
    assert.match(planningHub, /const approvalRequests = resolvedWorkspace\.approvalRequests \?\? \[\]/);
  });

  it("calms event detail hero for soft launch", () => {
    const hero = readSrc(
      "../../../components/events-phase3/EventDetailEaseHero.tsx",
    );
    const manageMenu = readSrc(
      "../../../components/event-workspace/EventManageMenu.tsx",
    );
    const notes = readSrc(
      "../../../components/events-phase3/EventDetailNotesEasePanel.tsx",
    );

    assert.doesNotMatch(
      hero,
      /Tasks, approvals, volunteers, and Create with AI/,
    );
    assert.doesNotMatch(hero, /EditEventDetailsButton/);
    assert.match(hero, /Generate Event Plan/);
    assert.match(hero, /createWithAiHref/);
    assert.match(hero, /includeEditDetails/);
    assert.match(hero, /iconOnly/);
    assert.match(manageMenu, /Edit details/);
    assert.match(hero, /Needs approval/);
    assert.match(hero, /Quick Tasks/);
    assert.match(hero, /Volunteer Staffing/);
    assert.doesNotMatch(hero, /label: "Posts"/);
    assert.match(hero, /h-32/);
    assert.doesNotMatch(hero, /formatEventTime/);
    assert.doesNotMatch(hero, /eventTypeLabel/);

    assert.match(notes, /Shared Notes/);
    assert.match(notes, /Recent Scratchpads/);
    assert.match(notes, /New Note/);
    assert.match(notes, /note-paper|repeating-linear-gradient/);
    assert.doesNotMatch(notes, /localStorage/);
  });
});
