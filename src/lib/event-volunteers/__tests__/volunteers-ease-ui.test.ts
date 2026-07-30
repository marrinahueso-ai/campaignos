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

  it("uses square cover art for focus cards and contain art for queue thumbs", () => {
    assert.match(
      ease,
      /relative h-14 w-14 shrink-0 rounded-xl/,
    );
    assert.match(ease, /aspect-square w-full md:self-start/);
    assert.match(ease, /variant="focus"/);
    assert.match(ease, /resize: variant === "focus" \? "cover" : "contain"/);
    assert.match(ease, /"object-cover object-center"/);
    assert.match(ease, /object-contain object-center p-1/);
    assert.match(ease, /sizes=\{isCompact \? "56px"/);
    assert.match(ease, /loading=\{priority \? "eager" : "lazy"\}/);
    assert.match(ease, /VolunteersQueueRow[\s\S]*ArtTile/);
  });
});
