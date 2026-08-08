import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function readSrc(relativeFromTest: string): string {
  return readFileSync(join(here, relativeFromTest), "utf8");
}

describe("event volunteers tenancy (source contract)", () => {
  const actions = readSrc("../actions.ts");
  const queries = readSrc("../queries.ts");
  const mutations = readSrc("../mutations.ts");
  const migration = readSrc(
    "../../../../supabase/migrations/20260801200000_event_volunteer_participants.sql",
  );
  const panel = readSrc(
    "../../../components/events-phase3/EventDetailVolunteersEasePanel.tsx",
  );
  const roster = readSrc(
    "../../../components/events-phase3/EventVolunteerRosterEase.tsx",
  );

  it("requireVolunteerContext gates with getEventById before overview/sync writes", () => {
    assert.match(actions, /async function requireVolunteerContext/);
    assert.match(actions, /getEventById\(eventId\)/);
    const ctxStart = actions.indexOf("async function requireVolunteerContext");
    const overviewStart = actions.indexOf(
      "export async function getEventVolunteerOverviewAction",
    );
    assert.ok(ctxStart >= 0);
    assert.ok(overviewStart > ctxStart);
    assert.match(actions, /requireVolunteerContext\(eventId\)/);
    assert.match(actions, /requireVolunteerContext\(input\.eventId\)/);
  });

  it("participant queries stay org + snapshot scoped", () => {
    assert.match(queries, /event_volunteer_participants/);
    assert.match(
      queries,
      /\.from\("event_volunteer_participants"\)[\s\S]*\.eq\("snapshot_id", snapshotId\)[\s\S]*\.eq\("organization_id", organizationId\)/,
    );
    assert.match(queries, /mapParticipantRow/);
  });

  it("participant inserts use organization_id and never store email", () => {
    assert.match(mutations, /event_volunteer_participants/);
    assert.match(mutations, /volunteer_name: participant\.name/);
    assert.doesNotMatch(mutations, /volunteer_email|\.email\b|email:/);
    assert.match(migration, /volunteer_name text not null/);
    assert.doesNotMatch(
      migration,
      /create table if not exists public\.event_volunteer_participants \([\s\S]*?\bemail\b/,
    );
    assert.match(migration, /private\.is_active_org_member\(organization_id\)/);
  });

  it("Ease roster resets ops state on event change and omits email UI", () => {
    assert.match(panel, /EventVolunteerRosterEase/);
    assert.match(panel, /\[event\.id\]/);
    assert.match(roster, /listEventVolunteerOpsAction/);
    assert.match(roster, /toggleEventVolunteerOpAction/);
    assert.match(roster, /\[eventId\]/);
    assert.match(roster, /Coverage/);
    assert.match(roster, /People/);
    assert.match(roster, /Items/);
    assert.match(roster, /Mark Arrived/);
    assert.match(roster, /Mark Received/);
    assert.doesNotMatch(roster, /email|Email/);
    assert.doesNotMatch(panel, /email|Email/);
  });
});
