import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readSrc(relativeFromTest: string): string {
  return readFileSync(new URL(relativeFromTest, import.meta.url), "utf8");
}

describe("Events home in-shell workspace navigation", () => {
  const home = readSrc(
    "../../../components/events-phase3/EventsHomeContent.tsx",
  );
  const host = readSrc(
    "../../../components/events-phase3/SelectedEventWorkspaceHost.tsx",
  );
  const actions = readSrc("../actions.ts");
  const shellLoader = readSrc("../workspace-shell.ts");
  const renderDetail = readSrc(
    "../../../app/(dashboard)/events/[id]/render-events-phase3.tsx",
  );

  it("opens workspace cards on /events?event=&tab= without Event ID router.push", () => {
    assert.match(home, /SelectedEventWorkspaceHost/);
    assert.match(home, /writeWorkspaceUrl/);
    assert.match(home, /history\.replaceState/);
    assert.doesNotMatch(home, /router\.push\(/);
    assert.doesNotMatch(
      home,
      /\/events\/\$\{encodeURIComponent\(eventId\)\}\?tab=/,
    );
  });

  it("bootstraps shared shell once via server action and reuses EventDetailPhase3Client", () => {
    assert.match(host, /loadEventWorkspaceShellAction/);
    assert.match(host, /EventDetailPhase3Client/);
    assert.match(host, /navigationMode="events-home"/);
    assert.match(host, /selected-event-workspace-loading/);
    assert.match(actions, /export async function loadEventWorkspaceShellAction/);
    assert.match(shellLoader, /loadEventWorkspaceShellPayload/);
    assert.match(renderDetail, /loadEventWorkspaceShellPayload/);
  });

  it("preserves selected event on Back and syncs tabs through the home URL", () => {
    assert.match(home, /syncWorkspaceTabUrl/);
    assert.match(home, /params\.delete\("tab"\)/);
    const shell = readSrc(
      "../../../components/events-phase3/EventDetailShell.tsx",
    );
    assert.match(shell, /events\?event=/);
    assert.match(shell, /navigationMode === "events-home"/);
    assert.match(shell, /onSyncTabUrl/);
  });
});
