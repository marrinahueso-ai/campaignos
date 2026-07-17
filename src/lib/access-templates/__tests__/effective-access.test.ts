import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applySafetyLocks } from "../defaults";
import {
  accessHasPermission,
  canAccessEvent,
  filterEventsByAccess,
  resolveTemplateForAccess,
  type EffectiveAccess,
} from "../effective-access-core";
import { mergeAccessTemplates } from "../merge";
import type { AccessTemplatePermissions } from "../types";

function perms(
  overrides: Partial<AccessTemplatePermissions>,
): AccessTemplatePermissions {
  return {
    view_all_events: true,
    view_assigned_events_only: false,
    draft_edit: false,
    submit_approval: false,
    approve_comms: false,
    publish_social: false,
    upload_artwork: false,
    manage_people: false,
    manage_billing: false,
    manage_integrations: false,
    ...overrides,
  };
}

function access(
  overrides: Partial<EffectiveAccess> & {
    permissions: AccessTemplatePermissions;
  },
): EffectiveAccess {
  return {
    organizationId: "org-1",
    membershipId: "member-1",
    email: "user@example.com",
    templateId: "contributor",
    baseRole: "contributor",
    assignedEventIds: [],
    viewAssignedEventsOnly: overrides.permissions.view_assigned_events_only,
    ...overrides,
  };
}

describe("resolveTemplateForAccess", () => {
  it("prefers custom template ids from org merge", () => {
    const templates = mergeAccessTemplates([
      {
        organization_id: "org-1",
        template_id: "custom_captain_abc123",
        display_name: "Team Captain",
        description: null,
        permissions: { approve_comms: true, view_all_events: true },
        base_role: "committee_chair",
        updated_at: "2026-07-16T00:00:00.000Z",
      },
    ]);

    const template = resolveTemplateForAccess(
      templates,
      "custom_captain_abc123",
      "contributor",
    );
    assert.equal(template.id, "custom_captain_abc123");
    assert.equal(template.baseRole, "committee_chair");
    assert.equal(template.permissions.approve_comms, true);
  });

  it("falls back to campaign role defaults when template missing", () => {
    const templates = mergeAccessTemplates([]);
    const template = resolveTemplateForAccess(
      templates,
      "custom_gone_xyz",
      "view_only",
    );
    assert.equal(template.id, "view_only");
    assert.equal(template.permissions.draft_edit, false);
  });
});

describe("accessHasPermission + safety locks", () => {
  it("reads permission keys from EffectiveAccess", () => {
    const next = access({
      permissions: perms({ manage_people: true, approve_comms: false }),
    });
    assert.equal(accessHasPermission(next, "manage_people"), true);
    assert.equal(accessHasPermission(next, "approve_comms"), false);
  });

  it("keeps admin manage_people after safety locks", () => {
    const locked = applySafetyLocks(
      "admin",
      perms({ manage_people: false }),
      "admin",
    );
    const next = access({
      templateId: "admin",
      baseRole: "admin",
      permissions: locked,
    });
    assert.equal(accessHasPermission(next, "manage_people"), true);
  });

  it("honors developer template upload_artwork false from org merge", () => {
    const templates = mergeAccessTemplates([
      {
        organization_id: "org-1",
        template_id: "developer",
        display_name: "Developer",
        description: null,
        permissions: {
          upload_artwork: false,
          draft_edit: true,
          view_all_events: true,
        },
        base_role: "developer",
        updated_at: "2026-07-16T00:00:00.000Z",
      },
    ]);
    const template = resolveTemplateForAccess(
      templates,
      "developer",
      "developer",
    );
    const locked = applySafetyLocks(
      template.id,
      template.permissions,
      template.baseRole,
    );
    const next = access({
      templateId: "developer",
      baseRole: "developer",
      permissions: locked,
    });
    assert.equal(template.permissions.upload_artwork, false);
    assert.equal(accessHasPermission(next, "upload_artwork"), false);
  });
});

describe("canAccessEvent / filterEventsByAccess", () => {
  it("allows all events when not assigned-only", () => {
    const next = access({
      permissions: perms({ view_all_events: true }),
      assignedEventIds: ["a"],
      viewAssignedEventsOnly: false,
    });
    assert.equal(canAccessEvent(next, "b"), true);
    assert.deepEqual(
      filterEventsByAccess(next, [{ id: "a" }, { id: "b" }]).map((e) => e.id),
      ["a", "b"],
    );
  });

  it("restricts to assigned event ids when assigned-only", () => {
    const next = access({
      permissions: perms({
        view_assigned_events_only: true,
        view_all_events: false,
      }),
      assignedEventIds: ["event-a", "event-c"],
      viewAssignedEventsOnly: true,
    });
    assert.equal(canAccessEvent(next, "event-a"), true);
    assert.equal(canAccessEvent(next, "event-b"), false);
    assert.deepEqual(
      filterEventsByAccess(next, [
        { id: "event-a" },
        { id: "event-b" },
        { id: "event-c" },
      ]).map((e) => e.id),
      ["event-a", "event-c"],
    );
  });

  it("returns unfiltered list when access is null", () => {
    const events = [{ id: "1" }, { id: "2" }];
    assert.deepEqual(filterEventsByAccess(null, events), events);
  });
});
