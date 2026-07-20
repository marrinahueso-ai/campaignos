import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isOrganizationId,
  normalizeOrganizationId,
  resolveActiveOrganizationId,
} from "../active-organization.ts";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

describe("active-organization isolation", () => {
  const orgA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const orgB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const foreign = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

  it("rejects malformed organization ids", () => {
    assert.equal(isOrganizationId("not-a-uuid"), false);
    assert.equal(isOrganizationId(""), false);
    assert.equal(isOrganizationId(null), false);
    assert.equal(isOrganizationId(orgA), true);
    assert.equal(normalizeOrganizationId(orgA.toUpperCase()), orgA);
  });

  it("ignores preferred org that is not in the membership list", () => {
    assert.equal(
      resolveActiveOrganizationId({
        preferredOrganizationId: foreign,
        membershipOrganizationIds: [orgA, orgB],
      }),
      orgA,
    );
  });

  it("uses preferred org only when membership includes it", () => {
    assert.equal(
      resolveActiveOrganizationId({
        preferredOrganizationId: orgB,
        membershipOrganizationIds: [orgA, orgB],
      }),
      orgB,
    );
  });

  it("falls back to oldest membership when preference missing", () => {
    assert.equal(
      resolveActiveOrganizationId({
        preferredOrganizationId: null,
        membershipOrganizationIds: [orgA, orgB],
      }),
      orgA,
    );
  });

  it("returns null when the user has no active memberships", () => {
    assert.equal(
      resolveActiveOrganizationId({
        preferredOrganizationId: orgA,
        membershipOrganizationIds: [],
      }),
      null,
    );
  });

  it("switch action requires membership assertion before writing cookie", () => {
    const actions = readFileSync(
      join(here, "../active-organization-actions.ts"),
      "utf8",
    );
    assert.match(actions, /assertActiveMembershipInOrganization/);
    assert.match(actions, /writeActiveOrganizationCookie/);
    assert.match(actions, /redirect\("\/dashboard"\)/);
    // Call order inside setActiveOrganizationAction (skip import lines).
    const fnStart = actions.indexOf(
      "export async function setActiveOrganizationAction",
    );
    const fnBody = actions.slice(fnStart);
    const assertIdx = fnBody.indexOf("assertActiveMembershipInOrganization");
    const writeIdx = fnBody.indexOf("writeActiveOrganizationCookie");
    assert.ok(assertIdx > 0 && writeIdx > assertIdx);
  });

  it("active membership resolution reads cookie but filters by user memberships", () => {
    const queries = readFileSync(join(here, "../membership-queries.ts"), "utf8");
    assert.match(queries, /readActiveOrganizationCookie/);
    assert.match(queries, /resolveActiveOrganizationId/);
    assert.match(queries, /\.eq\("user_id", user\.id\)/);
    assert.match(queries, /\.eq\("status", "active"\)/);
  });

  it("sign-out clears the active organization cookie", () => {
    const authActions = readFileSync(join(here, "../actions.ts"), "utf8");
    assert.match(authActions, /clearActiveOrganizationPreference/);
  });
});
