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

  it("keeps Create with AI as an in-page doorway", () => {
    assert.match(shell, /EventDetailCreateWithAiPanel/);
    assert.doesNotMatch(shell, /window\.location\.replace\(createWithAiUrl\)/);
  });
});
