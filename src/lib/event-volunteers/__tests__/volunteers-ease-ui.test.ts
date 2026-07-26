import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readSrc(relativeFromTest: string): string {
  return readFileSync(new URL(relativeFromTest, import.meta.url), "utf8");
}

describe("volunteers ease UI contracts", () => {
  const shell = readSrc(
    "../../../components/volunteers/VolunteersMasterShell.tsx",
  );
  const ease = readSrc(
    "../../../components/volunteers/VolunteersEaseList.tsx",
  );

  it("uses ease focus/queue instead of KPI cards and table", () => {
    assert.match(shell, /VolunteersFocusCard/);
    assert.match(shell, /Needs people/);
    assert.match(shell, /needs_people/);
    assert.doesNotMatch(shell, /VolunteersMasterKpiCards/);
    assert.doesNotMatch(shell, /This week/);
    assert.doesNotMatch(shell, /Top Roles \(by volunteers\)/);
  });

  it("surfaces open roles and signup on the focus card", () => {
    assert.match(ease, /underfilledRoles/);
    assert.match(ease, /Open signup/);
    assert.match(ease, /Event volunteers/);
  });
});
