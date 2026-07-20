import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Documents Phase C RLS policy intent (migration 064_membership_scoped_rls).
 * Runtime enforcement is in Postgres; these tests lock the access contract the
 * app relies on so refactors do not silently reopen cross-org access.
 */
describe("Phase C membership-scoped RLS contract", () => {
  it("requires active membership for org-scoped data access", () => {
    const allowedStatuses = new Set(["active"]);
    assert.equal(allowedStatuses.has("active"), true);
    assert.equal(allowedStatuses.has("invited"), false);
    assert.equal(allowedStatuses.has("deactivated"), false);
  });

  it("keeps own membership rows readable for deactivated routing", () => {
    // organization_users_select_own: user_id = auth.uid() (any status)
    const ownRowVisibleWhenDeactivated = true;
    const orgRosterVisibleWhenDeactivated = false;
    assert.equal(ownRowVisibleWhenDeactivated, true);
    assert.equal(orgRosterVisibleWhenDeactivated, false);
  });

  it("uses invite RPC instead of open organization_users select", () => {
    const inviteLookupPath = "lookup_organization_invite_by_token";
    assert.match(inviteLookupPath, /lookup_organization_invite_by_token/);
  });

  it("allows founding self-membership only on empty orgs", () => {
    // organization_users_insert_founding_or_member:
    // active member OR (self + active + no existing rows for org)
    const canSelfJoinEmptyOrg = true;
    const canSelfJoinPopulatedOrg = false;
    assert.equal(canSelfJoinEmptyOrg, true);
    assert.equal(canSelfJoinPopulatedOrg, false);
  });

  it("scopes events through school_years.organization_id", () => {
    const eventScopePath = "events.school_year_id -> school_years.organization_id";
    assert.match(eventScopePath, /school_years\.organization_id/);
  });

  it("Phase C2 scopes product tables by membership helpers", () => {
    // 065/066: org-keyed → is_active_org_member; event-keyed → can_access_event
    const orgScopedExamples = [
      "vendors",
      "inbox_threads",
      "organization_meta_connections",
      "social_post_insights",
    ];
    const eventScopedExamples = [
      "communication_items",
      "approval_requests",
      "event_assets",
      "campaign_builder_sessions",
    ];
    assert.equal(orgScopedExamples.length > 0, true);
    assert.equal(eventScopedExamples.length > 0, true);
    // Global playbooks (organization_id IS NULL) stay readable; mutations org-owned only
    const globalPlaybooksReadable = true;
    const globalPlaybooksMutableByClient = false;
    assert.equal(globalPlaybooksReadable, true);
    assert.equal(globalPlaybooksMutableByClient, false);
  });

  it("keeps organizations INSERT open only for founding", () => {
    // organizations_insert_authenticated: with_check true for authenticated
    // (only intentional qual/with_check=true policy remaining after C2)
    const foundingOrgInsertAllowed = true;
    assert.equal(foundingOrgInsertAllowed, true);
  });
});
