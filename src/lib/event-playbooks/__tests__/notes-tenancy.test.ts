import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

describe("event playbook notes tenancy (source contract)", () => {
  it("createEventPlaybookNoteAction gates with getEventById before insert", () => {
    const source = readFileSync(join(here, "../actions.ts"), "utf8");
    const fnStart = source.indexOf(
      "export async function createEventPlaybookNoteAction",
    );
    const fnEnd = source.indexOf(
      "export async function addEventPlaybookFilePlaceholderAction",
    );
    assert.ok(fnStart >= 0, "createEventPlaybookNoteAction not found");
    assert.ok(fnEnd > fnStart, "end of create note action not found");
    const fn = source.slice(fnStart, fnEnd);

    assert.match(fn, /getEventById\(eventId\)/);
    const gateIdx = fn.indexOf("getEventById(eventId)");
    const mutateIdx = fn.indexOf("createEventPlaybookNote(");
    assert.ok(gateIdx >= 0);
    assert.ok(mutateIdx > gateIdx, "getEventById must run before note insert");
    assert.match(fn, /createEventPlaybookNote\(event\.id/);
  });

  it("notes list query scopes by event_id with fetch cap", () => {
    const queries = readFileSync(join(here, "../queries.ts"), "utf8");
    assert.match(queries, /export async function getEventPlaybookNotesForEvent/);
    assert.match(
      queries,
      /\.from\("event_playbook_notes"\)[\s\S]*\.eq\("event_id", eventId\)/,
    );
    assert.match(queries, /EVENT_NOTES_FETCH_CAP/);
    assert.match(queries, /\.limit\(EVENT_NOTES_FETCH_CAP\)/);
  });

  it("notes tab loader and client action require event access before fetch", () => {
    const loaders = readFileSync(
      join(here, "../../events-phase3/tab-loaders.ts"),
      "utf8",
    );
    const actions = readFileSync(
      join(here, "../../events-phase3/actions.ts"),
      "utf8",
    );
    const panel = readFileSync(
      join(
        here,
        "../../../components/events-phase3/EventDetailNotesEasePanel.tsx",
      ),
      "utf8",
    );

    assert.match(loaders, /getEventPlaybookNotesForEvent\(eventId\)/);
    assert.doesNotMatch(
      loaders,
      /loadEventNotesTab[\s\S]*getEventPlaybookHubData/,
    );
    assert.match(actions, /getEventById\(eventId\)/);
    const actionGate = actions.indexOf("getEventById(eventId)");
    const actionLoad = actions.indexOf("loadEventDetailTabData(");
    assert.ok(actionGate >= 0);
    assert.ok(actionLoad > actionGate);

    // No unscoped localStorage drafts on the Notes panel.
    assert.doesNotMatch(panel, /localStorage/);
    assert.doesNotMatch(panel, /sessionStorage/);
  });
});
