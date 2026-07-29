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

  it("uses ease hero and soft tab pills", () => {
    assert.match(shell, /EventDetailEaseHero/);
    assert.match(shell, /role="tablist"/);
    assert.match(shell, /label: "Team"/);
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

  it("calms event detail hero for soft launch", () => {
    const hero = readSrc(
      "../../../components/events-phase3/EventDetailEaseHero.tsx",
    );
    const manageMenu = readSrc(
      "../../../components/event-workspace/EventManageMenu.tsx",
    );

    assert.doesNotMatch(
      hero,
      /Tasks, approvals, volunteers, and Create with AI/,
    );
    assert.doesNotMatch(hero, /EditEventDetailsButton/);
    assert.match(hero, /Create with AI/);
    assert.match(hero, /includeEditDetails/);
    assert.match(hero, /iconOnly/);
    assert.match(manageMenu, /Edit details/);
    assert.match(hero, /Needs approval/);
    assert.match(hero, /Open tasks/);
    assert.match(hero, /Volunteers/);
    assert.doesNotMatch(hero, /label: "Posts"/);
    assert.match(hero, /text-\[32px\]/);
    assert.match(hero, /bg-\[rgba\(255,252,247,0\.94\)\]/);
    assert.doesNotMatch(hero, /formatEventTime/);
    assert.doesNotMatch(hero, /eventTypeLabel/);
  });
});
