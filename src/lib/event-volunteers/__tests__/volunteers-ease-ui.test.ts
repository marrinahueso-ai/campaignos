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

  it("insets focus art with rounded rails while queue thumbs stay compact", () => {
    assert.match(
      ease,
      /relative h-14 w-14 shrink-0 overflow-hidden rounded-\[14px\]/,
    );
    assert.match(
      ease,
      /VolunteersFocusCard[\s\S]*?gap-3[\s\S]*?p-3[\s\S]*?minmax\(220px,280px\)_1fr/,
    );
    assert.match(
      ease,
      /min-h-\[240px\] w-full self-stretch overflow-hidden rounded-\[14px\]/,
    );
    assert.match(ease, /AppImage/);
    assert.match(ease, /resize=\{isCompact \? "cover" : "contain"\}/);
    assert.match(ease, /object-cover object-center/);
    assert.match(ease, /object-contain object-center p-1/);
    assert.match(ease, /bg-cos-bg/);
    assert.match(ease, /sizes=\{isCompact \? "56px"/);
    assert.match(ease, /VolunteersQueueRow[\s\S]*ArtTile/);
  });
});

