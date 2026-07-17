import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applySafetyLocks,
  buildCustomTemplateId,
  DEFAULT_ACCESS_TEMPLATES,
  normalizePermissions,
} from "../defaults";
import {
  accessTemplateLabelMap,
  hasAccessPermission,
  mergeAccessTemplates,
  resolveAccessTemplateSelection,
} from "../merge";
import type { AccessTemplateRow } from "../types";
import { isCustomAccessTemplateId } from "../types";

describe("access templates defaults", () => {
  it("includes every CampaignRole-shaped template id once", () => {
    const ids = DEFAULT_ACCESS_TEMPLATES.map((template) => template.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.includes("admin"));
    assert.ok(ids.includes("committee_chair"));
    assert.ok(ids.includes("view_only"));
  });

  it("keeps manage_people on for Admin and President", () => {
    const unlocked = normalizePermissions(
      { manage_people: false },
      DEFAULT_ACCESS_TEMPLATES.find((t) => t.id === "admin")!.permissions,
    );
    assert.equal(applySafetyLocks("admin", unlocked).manage_people, true);
    assert.equal(applySafetyLocks("president", unlocked).manage_people, true);
    assert.equal(
      applySafetyLocks("contributor", unlocked).manage_people,
      false,
    );
  });

  it("makes list view modes mutually exclusive and migrates to Mode B", () => {
    const next = normalizePermissions(
      { view_assigned_events_only: true, view_all_events: true },
      DEFAULT_ACCESS_TEMPLATES.find((t) => t.id === "view_only")!.permissions,
    );
    assert.equal(next.view_assigned_events_only, true);
    assert.equal(next.view_all_events, false);
    assert.equal(next.access_assigned_events_only, true);
  });

  it("allows Mode A: see all while restricting work to assigned", () => {
    const next = normalizePermissions(
      {
        view_all_events: true,
        access_assigned_events_only: true,
        view_assigned_events_only: false,
      },
      DEFAULT_ACCESS_TEMPLATES.find((t) => t.id === "view_only")!.permissions,
    );
    assert.equal(next.view_all_events, true);
    assert.equal(next.view_assigned_events_only, false);
    assert.equal(next.access_assigned_events_only, true);
  });

  it("preserves explicit false toggles over true fallbacks", () => {
    const next = normalizePermissions(
      { upload_artwork: false },
      DEFAULT_ACCESS_TEMPLATES.find((t) => t.id === "developer")!.permissions,
    );
    assert.equal(next.upload_artwork, false);
  });

  it("builds custom template ids", () => {
    const id = buildCustomTemplateId("Team Parent");
    assert.equal(isCustomAccessTemplateId(id), true);
    assert.match(id, /^custom_team_parent_[a-z0-9]+$/);
  });
});

describe("mergeAccessTemplates", () => {
  it("falls back to defaults when no rows exist", () => {
    const merged = mergeAccessTemplates([]);
    assert.equal(merged.length, DEFAULT_ACCESS_TEMPLATES.length);
    assert.equal(
      merged.find((t) => t.id === "committee_chair")?.displayName,
      "Event Lead",
    );
  });

  it("applies org display names without changing template ids", () => {
    const rows: AccessTemplateRow[] = [
      {
        organization_id: "org-1",
        template_id: "president",
        display_name: "Board Chair",
        description: "HOA leadership seat",
        permissions: { manage_people: true },
        base_role: "president",
        updated_at: "2026-07-16T00:00:00.000Z",
      },
      {
        organization_id: "org-1",
        template_id: "committee_chair",
        display_name: "Team Captain",
        description: null,
        permissions: { view_assigned_events_only: true },
        base_role: "committee_chair",
        updated_at: "2026-07-16T00:00:00.000Z",
      },
    ];

    const merged = mergeAccessTemplates(rows);
    const president = merged.find((t) => t.id === "president")!;
    const captain = merged.find((t) => t.id === "committee_chair")!;

    assert.equal(president.id, "president");
    assert.equal(president.displayName, "Board Chair");
    assert.equal(president.description, "HOA leadership seat");
    assert.equal(president.permissions.manage_people, true);

    assert.equal(captain.displayName, "Team Captain");
    assert.equal(captain.permissions.view_assigned_events_only, true);
    assert.equal(captain.permissions.view_all_events, false);
    // Legacy assigned-only row migrates to Mode B (access restrict too).
    assert.equal(captain.permissions.access_assigned_events_only, true);
  });

  it("appends custom org roles", () => {
    const merged = mergeAccessTemplates([
      {
        organization_id: "org-1",
        template_id: "custom_treasurer_abc123",
        display_name: "Treasurer",
        description: "Handles dues",
        permissions: { draft_edit: true, view_all_events: true },
        base_role: "contributor",
        updated_at: "2026-07-16T00:00:00.000Z",
      },
    ]);
    const custom = merged.find((t) => t.id === "custom_treasurer_abc123");
    assert.ok(custom);
    assert.equal(custom.isCustom, true);
    assert.equal(custom.baseRole, "contributor");
    assert.equal(custom.displayName, "Treasurer");
  });

  it("forces manage_people on when a row tries to disable Admin", () => {
    const merged = mergeAccessTemplates([
      {
        organization_id: "org-1",
        template_id: "admin",
        display_name: "Org Admin",
        description: null,
        permissions: { manage_people: false },
        updated_at: "2026-07-16T00:00:00.000Z",
      },
    ]);
    assert.equal(
      merged.find((t) => t.id === "admin")?.permissions.manage_people,
      true,
    );
  });

  it("lets org override developer upload_artwork false over defaults", () => {
    assert.equal(
      DEFAULT_ACCESS_TEMPLATES.find((t) => t.id === "developer")?.permissions
        .upload_artwork,
      true,
    );

    const merged = mergeAccessTemplates([
      {
        organization_id: "org-1",
        template_id: "developer",
        display_name: "Developer",
        description: null,
        permissions: { upload_artwork: false },
        base_role: "developer",
        updated_at: "2026-07-16T00:00:00.000Z",
      },
    ]);

    assert.equal(
      merged.find((t) => t.id === "developer")?.permissions.upload_artwork,
      false,
    );
    assert.equal(
      hasAccessPermission(merged, "developer", "upload_artwork"),
      false,
    );
  });

  it("builds a label map for People UI", () => {
    const map = accessTemplateLabelMap(
      mergeAccessTemplates([
        {
          organization_id: "org-1",
          template_id: "vp_communications",
          display_name: "Communications Elder",
          description: null,
          permissions: {},
          updated_at: "2026-07-16T00:00:00.000Z",
        },
      ]),
    );
    assert.equal(map.vp_communications, "Communications Elder");
    assert.equal(map.admin, "Admin");
  });

  it("resolves permission checks from merged templates", () => {
    const templates = mergeAccessTemplates([]);
    assert.equal(hasAccessPermission(templates, "admin", "manage_billing"), true);
    assert.equal(
      hasAccessPermission(templates, "view_only", "publish_social"),
      false,
    );
  });

  it("resolves permission checks by custom template id", () => {
    const templates = mergeAccessTemplates([
      {
        organization_id: "org-1",
        template_id: "custom_treasurer_abc123",
        display_name: "Treasurer",
        description: null,
        permissions: {
          manage_billing: true,
          draft_edit: true,
          view_all_events: true,
        },
        base_role: "contributor",
        updated_at: "2026-07-16T00:00:00.000Z",
      },
    ]);
    assert.equal(
      hasAccessPermission(templates, "custom_treasurer_abc123", "manage_billing"),
      true,
    );
    assert.equal(
      hasAccessPermission(templates, "custom_treasurer_abc123", "manage_people"),
      false,
    );
    assert.equal(
      hasAccessPermission(templates, "custom_missing_xyz", "draft_edit"),
      false,
    );
  });

  it("resolves invite selection for custom templates via base role", () => {
    const templates = mergeAccessTemplates([
      {
        organization_id: "org-1",
        template_id: "custom_secretary_xyz789",
        display_name: "Secretary",
        description: null,
        permissions: {},
        base_role: "view_only",
        updated_at: "2026-07-16T00:00:00.000Z",
      },
    ]);
    const selection = resolveAccessTemplateSelection(
      templates,
      "custom_secretary_xyz789",
    );
    assert.deepEqual(selection, {
      templateId: "custom_secretary_xyz789",
      campaignRole: "view_only",
    });
  });
});
