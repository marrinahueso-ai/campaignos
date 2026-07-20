import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applySafetyLocks, normalizePermissions } from "../defaults";
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
    access_assigned_events_only: false,
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
    accessAssignedEventsOnly:
      overrides.permissions.access_assigned_events_only,
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

  it("fails closed to view_only when a custom template is missing", () => {
    const templates = mergeAccessTemplates([]);
    const template = resolveTemplateForAccess(
      templates,
      "custom_gone_xyz",
      "admin",
    );
    assert.equal(template.id, "view_only");
    assert.equal(template.permissions.draft_edit, false);
    assert.equal(template.permissions.manage_people, false);
  });

  it("still resolves system role defaults when preferred id is a campaign role", () => {
    const templates = mergeAccessTemplates([]);
    const template = resolveTemplateForAccess(
      templates,
      "contributor",
      "admin",
    );
    assert.equal(template.id, "contributor");
    assert.equal(template.permissions.draft_edit, true);
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

describe("canAccessEvent / filterEventsByAccess Mode A vs B", () => {
  it("unrestricted: see all and work on all", () => {
    const next = access({
      permissions: perms({ view_all_events: true }),
      assignedEventIds: ["a"],
      viewAssignedEventsOnly: false,
      accessAssignedEventsOnly: false,
    });
    assert.equal(canAccessEvent(next, "b"), true);
    assert.deepEqual(
      filterEventsByAccess(next, [{ id: "a" }, { id: "b" }]).map((e) => e.id),
      ["a", "b"],
    );
  });

  it("Mode A: see all cards, work only on assigned", () => {
    const next = access({
      permissions: perms({
        view_all_events: true,
        view_assigned_events_only: false,
        access_assigned_events_only: true,
      }),
      assignedEventIds: ["event-a", "event-c"],
      viewAssignedEventsOnly: false,
      accessAssignedEventsOnly: true,
    });
    assert.equal(canAccessEvent(next, "event-a"), true);
    assert.equal(canAccessEvent(next, "event-b"), false);
    assert.deepEqual(
      filterEventsByAccess(next, [
        { id: "event-a" },
        { id: "event-b" },
        { id: "event-c" },
      ]).map((e) => e.id),
      ["event-a", "event-b", "event-c"],
    );
  });

  it("Mode B: hide unassigned cards and restrict work", () => {
    const next = access({
      permissions: perms({
        view_assigned_events_only: true,
        view_all_events: false,
        access_assigned_events_only: true,
      }),
      assignedEventIds: ["event-a", "event-c"],
      viewAssignedEventsOnly: true,
      accessAssignedEventsOnly: true,
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

  it("denies unassigned event ids when access-restrict is on (IDOR core)", () => {
    const next = access({
      permissions: perms({
        view_all_events: true,
        access_assigned_events_only: true,
      }),
      assignedEventIds: ["assigned-1"],
      viewAssignedEventsOnly: false,
      accessAssignedEventsOnly: true,
    });
    assert.equal(canAccessEvent(next, "assigned-1"), true);
    assert.equal(canAccessEvent(next, "unassigned-2"), false);
  });
});

describe("normalizePermissions Mode A / B / migration", () => {
  const fallback = perms({});

  it("migrates legacy view_assigned_events_only to Mode B", () => {
    const next = normalizePermissions(
      { view_assigned_events_only: true },
      fallback,
    );
    assert.equal(next.view_assigned_events_only, true);
    assert.equal(next.view_all_events, false);
    assert.equal(next.access_assigned_events_only, true);
  });

  it("keeps Mode A: see all + work assigned only", () => {
    const next = normalizePermissions(
      {
        view_all_events: true,
        view_assigned_events_only: false,
        access_assigned_events_only: true,
      },
      fallback,
    );
    assert.equal(next.view_all_events, true);
    assert.equal(next.view_assigned_events_only, false);
    assert.equal(next.access_assigned_events_only, true);
  });

  it("forces access restrict when Mode B list-hide is on", () => {
    const next = normalizePermissions(
      {
        view_assigned_events_only: true,
        view_all_events: true,
        access_assigned_events_only: false,
      },
      fallback,
    );
    assert.equal(next.view_assigned_events_only, true);
    assert.equal(next.view_all_events, false);
    assert.equal(next.access_assigned_events_only, true);
  });
});

describe("getEventById assigned-only gate (source)", () => {
  it("enforces canAccessEvent after org school-year checks", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(
      new URL("../../events/queries.ts", import.meta.url),
      "utf8",
    );
    assert.match(source, /canAccessEvent\(access, id\)/);
    assert.match(source, /requireEventAccess/);
  });
});
