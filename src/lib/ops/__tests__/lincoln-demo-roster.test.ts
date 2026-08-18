import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  LINCOLN_DEMO_PEOPLE,
  LINCOLN_ELEMENTARY_ORG_ID,
  assertDemoEmail,
  assertLincolnDemoOrg,
} from "../../../../scripts/lincoln-elementary-demo-roster.mjs";
import { AI_APIS_PINNED_ORGANIZATIONS } from "../ai-apis-constants.ts";

describe("Lincoln Elementary demo roster", () => {
  it("keeps every person on @example.com and the School B org id", () => {
    assert.equal(
      LINCOLN_ELEMENTARY_ORG_ID,
      "0a7efc8a-ff81-4d68-8a5d-a695d2df5476",
    );
    assert.equal(LINCOLN_DEMO_PEOPLE.length, 15);
    const emails = LINCOLN_DEMO_PEOPLE.map((person) =>
      assertDemoEmail(person.email),
    );
    assert.equal(new Set(emails).size, emails.length);
    assert.ok(emails.every((email) => email.endsWith("@example.com")));
    assert.equal(
      AI_APIS_PINNED_ORGANIZATIONS.find((org) => org.id === LINCOLN_ELEMENTARY_ORG_ID)
        ?.id,
      LINCOLN_ELEMENTARY_ORG_ID,
    );
  });

  it("refuses Edmondson and unnamed orgs", () => {
    assert.throws(() =>
      assertLincolnDemoOrg({
        id: "d88b2f96-b924-4bd5-b6e2-40ad8ee84592",
        name: "Lincoln Elementary",
      }),
    );
    assert.throws(() =>
      assertLincolnDemoOrg({
        id: LINCOLN_ELEMENTARY_ORG_ID,
        name: "Edmondson Elementary",
      }),
    );
    assert.doesNotThrow(() =>
      assertLincolnDemoOrg({
        id: LINCOLN_ELEMENTARY_ORG_ID,
        name: "Lincolin Elementary",
      }),
    );
  });

  it("is not imported by product seed or workspace code", () => {
    const seed = readFileSync(
      new URL("../../organization-workspace/seed.ts", import.meta.url),
      "utf8",
    );
    const workspaceActions = readFileSync(
      new URL("../../organization-workspace/actions.ts", import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(seed, /sarah\.mitchell@example\.com/);
    assert.doesNotMatch(seed, /LINCOLN_DEMO_PEOPLE/);
    assert.doesNotMatch(workspaceActions, /sarah\.mitchell@example\.com/);
  });
});
