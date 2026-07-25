import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ACTIVE_ORGANIZATION_COOKIE } from "../active-organization.ts";
import { resolveOrgGateRedirect } from "../org-gate.ts";
import { BILLING_CANCELED_PATH } from "../../billing/subscription-lockout.ts";

type OrgUserRow = {
  user_id: string;
  organization_id: string;
  status: string;
};

type OrganizationRow = {
  id: string;
  billing_exempt_at: string | null;
  subscription_status: string | null;
};

/**
 * Minimal chainable Supabase stub covering the exact call shapes used by
 * getOrganizationAccessState / resolveEdgeActiveOrganizationId (awaited
 * directly after .eq() chains) and getOrganizationCanceledLockout
 * (.maybeSingle()).
 */
function makeSupabaseStub(data: {
  organizationUsers: OrgUserRow[];
  organizations: OrganizationRow[];
}) {
  const tables: Record<string, Array<Record<string, unknown>>> = {
    organization_users: data.organizationUsers,
    organizations: data.organizations,
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
const ORG_FOUNDING = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

describe("resolveOrgGateRedirect — canceled-subscription lockout", () => {
  it("does not redirect an org with an active paid subscription", async () => {
    const supabase = makeSupabaseStub({
      organizationUsers: [
        { user_id: USER, organization_id: ORG_ACTIVE, status: "active" },
      ],
      organizations: [
        {
          id: ORG_ACTIVE,
          billing_exempt_at: null,
          subscription_status: "active",
        },
      ],
    });

    const result = await resolveOrgGateRedirect(
      makeRequest("/dashboard", ORG_ACTIVE),
      supabase,
      USER,
    );
    assert.equal(result, null);
  });

  it("redirects to /billing/canceled when the resolved active org was actually canceled", async () => {
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
    );
    assert.equal(result, BILLING_CANCELED_PATH);
  });

  it("never redirects a request already on /billing/canceled (no redirect loop)", async () => {
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
      makeRequest(BILLING_CANCELED_PATH, ORG_CANCELED),
      supabase,
      USER,
    );
    assert.equal(result, null);
  });

  it("founding/billing-exempt org is never locked out, even with a stale canceled status", async () => {
    const supabase = makeSupabaseStub({
      organizationUsers: [
        { user_id: USER, organization_id: ORG_FOUNDING, status: "active" },
      ],
      organizations: [
        {
          id: ORG_FOUNDING,
          billing_exempt_at: "2026-01-01T00:00:00.000Z",
          subscription_status: "canceled",
        },
      ],
    });

    const result = await resolveOrgGateRedirect(
      makeRequest("/dashboard", ORG_FOUNDING),
      supabase,
      USER,
    );
    assert.equal(result, null);
  });

  it("multi-org isolation: only the resolved (cookie-preferred) org is gated, not the user's other org", async () => {
    const supabase = makeSupabaseStub({
      organizationUsers: [
        { user_id: USER, organization_id: ORG_ACTIVE, status: "active" },
        { user_id: USER, organization_id: ORG_CANCELED, status: "active" },
      ],
      organizations: [
        {
          id: ORG_ACTIVE,
          billing_exempt_at: null,
          subscription_status: "active",
        },
        {
          id: ORG_CANCELED,
          billing_exempt_at: null,
          subscription_status: "canceled",
        },
      ],
    });

    // Cookie prefers the healthy org — must pass through untouched.
    const passResult = await resolveOrgGateRedirect(
      makeRequest("/dashboard", ORG_ACTIVE),
      supabase,
      USER,
    );
    assert.equal(passResult, null);

    // Same user, cookie now prefers the canceled org — must be gated.
    const blockedResult = await resolveOrgGateRedirect(
      makeRequest("/dashboard", ORG_CANCELED),
      supabase,
      USER,
    );
    assert.equal(blockedResult, BILLING_CANCELED_PATH);
  });

  it("a brand-new trial org (never subscribed) is not locked out", async () => {
    const orgId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const supabase = makeSupabaseStub({
      organizationUsers: [
        { user_id: USER, organization_id: orgId, status: "active" },
      ],
      organizations: [
        {
          id: orgId,
          billing_exempt_at: null,
          subscription_status: "trialing",
        },
      ],
    });

    const result = await resolveOrgGateRedirect(
      makeRequest("/dashboard", orgId),
      supabase,
      USER,
    );
    assert.equal(result, null);
  });

  it("an expired-trial org that never subscribed to Stripe (Starter fallback) is not locked out", async () => {
    const orgId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    const supabase = makeSupabaseStub({
      organizationUsers: [
        { user_id: USER, organization_id: orgId, status: "active" },
      ],
      organizations: [
        {
          id: orgId,
          billing_exempt_at: null,
          subscription_status: "none",
        },
      ],
    });

    const result = await resolveOrgGateRedirect(
      makeRequest("/dashboard", orgId),
      supabase,
      USER,
    );
    assert.equal(result, null);
  });
});
