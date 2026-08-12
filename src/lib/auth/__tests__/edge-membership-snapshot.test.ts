import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ACTIVE_ORGANIZATION_COOKIE } from "../active-organization.ts";
import { getEdgeMembershipSnapshot } from "../organization-access-state.ts";
import { resolveOrgGateRedirect } from "../org-gate.ts";
import { userMustSignDeveloperAgreements } from "../../developer-agreements/gate.ts";
import { BILLING_CANCELED_PATH } from "../../billing/subscription-lockout.ts";

/**
 * Phase 2 — middleware now fetches one `organization_users` snapshot and
 * hands it to both the developer-agreements gate and the org gate, instead
 * of each gate querying independently. These tests pin that the snapshot
 * produces identical decisions to the old independent-query behavior.
 */

type OrgUserRow = {
  user_id: string;
  organization_id: string;
  status: string;
  campaign_role?: string | null;
};

type OrganizationRow = {
  id: string;
  billing_exempt_at: string | null;
  subscription_status: string | null;
};

type DocumentRow = {
  id: string;
  required_for_roles: string[] | null;
  current_version_id: string | null;
  is_active: boolean;
};

type SignatureRow = { user_id: string; version_id: string };

function makeSupabaseStub(data: {
  organizationUsers: OrgUserRow[];
  organizations?: OrganizationRow[];
  documents?: DocumentRow[];
  signatures?: SignatureRow[];
}) {
  const tables: Record<string, Array<Record<string, unknown>>> = {
    organization_users: data.organizationUsers,
    organizations: data.organizations ?? [],
    developer_agreement_documents: data.documents ?? [],
    developer_agreement_signatures: data.signatures ?? [],
  };

  return {
    from(table: string) {
      let rows = tables[table] ?? [];
      const builder = {
        select() {
          return builder;
        },
        eq(column: string, value: unknown) {
          rows = rows.filter((row) => row[column] === value);
          return builder;
        },
        in(column: string, values: unknown[]) {
          rows = rows.filter((row) => values.includes(row[column]));
          return builder;
        },
        maybeSingle() {
          return Promise.resolve({ data: rows[0] ?? null, error: null });
        },
        then(
          resolve: (value: { data: unknown; error: null }) => unknown,
          reject?: (reason: unknown) => unknown,
        ) {
          return Promise.resolve({ data: rows, error: null }).then(
            resolve,
            reject,
          );
        },
      };
      return builder;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function makeRequest(pathname: string, cookieValue?: string) {
  return {
    nextUrl: { pathname },
    cookies: {
      get(name: string) {
        if (name === ACTIVE_ORGANIZATION_COOKIE && cookieValue) {
          return { value: cookieValue };
        }
        return undefined;
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const USER = "user-1";
const ORG_ACTIVE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORG_CANCELED = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("getEdgeMembershipSnapshot", () => {
  it("derives access state, roles, and active org ids from one query", async () => {
    const supabase = makeSupabaseStub({
      organizationUsers: [
        {
          user_id: USER,
          organization_id: ORG_ACTIVE,
          status: "active",
          campaign_role: "developer",
        },
        {
          user_id: USER,
          organization_id: ORG_CANCELED,
          status: "deactivated",
          campaign_role: "admin",
        },
      ],
    });

    const snapshot = await getEdgeMembershipSnapshot(supabase, USER);
    assert.equal(snapshot.accessState, "active");
    assert.deepEqual(snapshot.campaignRoles, ["developer"]);
    assert.deepEqual(snapshot.activeOrganizationIds, [ORG_ACTIVE]);
  });

  it("returns none with empty derived fields when the user has no memberships", async () => {
    const supabase = makeSupabaseStub({ organizationUsers: [] });
    const snapshot = await getEdgeMembershipSnapshot(supabase, USER);
    assert.equal(snapshot.accessState, "none");
    assert.deepEqual(snapshot.campaignRoles, []);
    assert.deepEqual(snapshot.activeOrganizationIds, []);
  });
});

describe("resolveOrgGateRedirect — snapshot vs. live-query parity", () => {
  it("snapshot path matches live-query path for a healthy active org", async () => {
    const supabase = makeSupabaseStub({
      organizationUsers: [
        { user_id: USER, organization_id: ORG_ACTIVE, status: "active" },
      ],
      organizations: [
        { id: ORG_ACTIVE, billing_exempt_at: null, subscription_status: "active" },
      ],
    });
    const snapshot = await getEdgeMembershipSnapshot(supabase, USER);

    const withSnapshot = await resolveOrgGateRedirect(
      makeRequest("/dashboard", ORG_ACTIVE),
      supabase,
      USER,
      snapshot,
    );
    const live = await resolveOrgGateRedirect(
      makeRequest("/dashboard", ORG_ACTIVE),
      supabase,
      USER,
    );
    assert.equal(withSnapshot, null);
    assert.equal(live, null);
  });

  it("snapshot path matches live-query path for a canceled org", async () => {
    const supabase = makeSupabaseStub({
      organizationUsers: [
        { user_id: USER, organization_id: ORG_CANCELED, status: "active" },
      ],
      organizations: [
        {
          id: ORG_CANCELED,
          billing_exempt_at: null,
          subscription_status: "canceled",
        },
      ],
    });
    const snapshot = await getEdgeMembershipSnapshot(supabase, USER);

    const withSnapshot = await resolveOrgGateRedirect(
      makeRequest("/dashboard", ORG_CANCELED),
      supabase,
      USER,
      snapshot,
    );
    const live = await resolveOrgGateRedirect(
      makeRequest("/dashboard", ORG_CANCELED),
      supabase,
      USER,
    );
    assert.equal(withSnapshot, BILLING_CANCELED_PATH);
    assert.equal(live, BILLING_CANCELED_PATH);
  });

  it("falls back to a live query when no snapshot is provided (timeout safety)", async () => {
    const supabase = makeSupabaseStub({
      organizationUsers: [
        { user_id: USER, organization_id: ORG_CANCELED, status: "active" },
      ],
      organizations: [
        {
          id: ORG_CANCELED,
          billing_exempt_at: null,
          subscription_status: "canceled",
        },
      ],
    });

    const result = await resolveOrgGateRedirect(
      makeRequest("/dashboard", ORG_CANCELED),
      supabase,
      USER,
      null,
    );
    assert.equal(result, BILLING_CANCELED_PATH);
  });
});

describe("userMustSignDeveloperAgreements — precomputed roles parity", () => {
  it("skips the roles query and returns false for a precomputed empty role list", async () => {
    const supabase = makeSupabaseStub({
      organizationUsers: [
        { user_id: USER, organization_id: ORG_ACTIVE, status: "active", campaign_role: "admin" },
      ],
      documents: [
        {
          id: "doc-1",
          required_for_roles: ["developer"],
          current_version_id: "v1",
          is_active: true,
        },
      ],
    });

    const result = await userMustSignDeveloperAgreements(supabase, USER, []);
    assert.equal(result, false);
  });

  it("precomputed developer role still requires signing when unsigned", async () => {
    const supabase = makeSupabaseStub({
      organizationUsers: [
        { user_id: USER, organization_id: ORG_ACTIVE, status: "active", campaign_role: "developer" },
      ],
      documents: [
        {
          id: "doc-1",
          required_for_roles: ["developer"],
          current_version_id: "v1",
          is_active: true,
        },
      ],
      signatures: [],
    });

    const withPrecomputed = await userMustSignDeveloperAgreements(
      supabase,
      USER,
      ["developer"],
    );
    const live = await userMustSignDeveloperAgreements(supabase, USER);
    assert.equal(withPrecomputed, true);
    assert.equal(live, true);
  });

  it("precomputed developer role resolves false once signed, matching live query", async () => {
    const supabase = makeSupabaseStub({
      organizationUsers: [
        { user_id: USER, organization_id: ORG_ACTIVE, status: "active", campaign_role: "developer" },
      ],
      documents: [
        {
          id: "doc-1",
          required_for_roles: ["developer"],
          current_version_id: "v1",
          is_active: true,
        },
      ],
      signatures: [{ user_id: USER, version_id: "v1" }],
    });

    const withPrecomputed = await userMustSignDeveloperAgreements(
      supabase,
      USER,
      ["developer"],
    );
    const live = await userMustSignDeveloperAgreements(supabase, USER);
    assert.equal(withPrecomputed, false);
    assert.equal(live, false);
  });
});
