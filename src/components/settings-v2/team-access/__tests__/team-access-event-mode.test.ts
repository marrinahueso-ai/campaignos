import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyEventAccessMode,
  buildPermissionsFromCreateRoleForm,
  deriveEventAccessMode,
  eventAccessModeLabel,
  isAssignedOnlyAccess,
} from "@/components/settings-v2/team-access/team-access-event-mode";
import { emptyPermissions } from "@/lib/access-templates/defaults";

describe("team-access event access modes", () => {
  it("maps ALL / MIXED / ASSIGNED to permission flags", () => {
    const all = applyEventAccessMode(emptyPermissions(), "all");
    assert.equal(all.view_all_events, true);
    assert.equal(all.view_assigned_events_only, false);
    assert.equal(all.access_assigned_events_only, false);
    assert.equal(deriveEventAccessMode(all), "all");

    const mixed = applyEventAccessMode(emptyPermissions(), "mixed");
    assert.equal(mixed.view_all_events, true);
    assert.equal(mixed.access_assigned_events_only, true);
    assert.equal(mixed.view_assigned_events_only, false);
    assert.equal(deriveEventAccessMode(mixed), "mixed");
    assert.equal(isAssignedOnlyAccess(mixed), true);

    const assigned = applyEventAccessMode(emptyPermissions(), "assigned");
    assert.equal(assigned.view_assigned_events_only, true);
    assert.equal(assigned.access_assigned_events_only, true);
    assert.equal(assigned.view_all_events, false);
    assert.equal(deriveEventAccessMode(assigned), "assigned");
    assert.equal(eventAccessModeLabel("assigned"), "Assigned events only");
  });

  it("builds create-role permissions from form toggles", () => {
    const permissions = buildPermissionsFromCreateRoleForm({
      eventMode: "mixed",
      draftEdit: true,
      submitApproval: true,
      approveComms: false,
      publishSocial: false,
      uploadArtwork: true,
      managePeople: false,
      manageBilling: false,
      manageIntegrations: true,
    });

    assert.equal(permissions.view_all_events, true);
    assert.equal(permissions.access_assigned_events_only, true);
    assert.equal(permissions.draft_edit, true);
    assert.equal(permissions.submit_approval, true);
    assert.equal(permissions.approve_comms, false);
    assert.equal(permissions.upload_artwork, true);
    assert.equal(permissions.manage_integrations, true);
    assert.equal(permissions.manage_people, false);
  });
});
