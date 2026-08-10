import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildInviteEventMemberRoleOptions,
  formatInviteEventContextDate,
  inviteMemberInitials,
  isValidInviteEmail,
  mapSelectedRoleToCampaignRole,
  mergeEventAssignmentIds,
  validateInviteEventMemberForm,
} from "@/lib/events-phase3/invite-event-member";
import type { AccessTemplate } from "@/lib/access-templates/types";

function template(
  overrides: Partial<AccessTemplate> & Pick<AccessTemplate, "id" | "baseRole" | "displayName">,
): AccessTemplate {
  return {
    description: "",
    isCustom: false,
    permissions: {
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
      send_newsletter: false,
      manage_newsletter_contacts: false,
    },
    ...overrides,
  };
}

describe("invite-event-member helpers", () => {
  it("validates name, email, and role", () => {
    assert.equal(
      validateInviteEventMemberForm({
        name: "",
        email: "a@b.com",
        roleId: "contributor",
      }),
      "Name is required.",
    );
    assert.equal(
      validateInviteEventMemberForm({
        name: "Jane",
        email: "",
        roleId: "contributor",
      }),
      "Email is required.",
    );
    assert.equal(
      validateInviteEventMemberForm({
        name: "Jane",
        email: "not-an-email",
        roleId: "contributor",
      }),
      "Enter a valid email address.",
    );
    assert.equal(
      validateInviteEventMemberForm({
        name: "Jane",
        email: "jane@school.org",
        roleId: "",
      }),
      "Select a role.",
    );
    assert.equal(
      validateInviteEventMemberForm({
        name: "Jane",
        email: "jane@school.org",
        roleId: "committee_chair",
      }),
      null,
    );
  });

  it("accepts valid emails only", () => {
    assert.equal(isValidInviteEmail("jane@school.org"), true);
    assert.equal(isValidInviteEmail(" bad "), false);
    assert.equal(isValidInviteEmail(""), false);
  });

  it("maps drawer role selection to canonical campaign roles", () => {
    const options = buildInviteEventMemberRoleOptions([
      template({
        id: "committee_chair",
        baseRole: "committee_chair",
        displayName: "Event Lead",
      }),
      template({
        id: "contributor",
        baseRole: "contributor",
        displayName: "Contributor",
      }),
    ]);
    assert.equal(
      mapSelectedRoleToCampaignRole("committee_chair", options),
      "committee_chair",
    );
    assert.equal(
      mapSelectedRoleToCampaignRole("contributor", options),
      "contributor",
    );
    assert.equal(mapSelectedRoleToCampaignRole("president", options), "president");
    assert.equal(mapSelectedRoleToCampaignRole("nope", options), null);
  });

  it("builds Pilot-aligned role list and excludes developer/tester", () => {
    const options = buildInviteEventMemberRoleOptions([
      template({ id: "admin", baseRole: "admin", displayName: "Admin" }),
      template({
        id: "president",
        baseRole: "president",
        displayName: "President",
      }),
      template({
        id: "developer",
        baseRole: "developer",
        displayName: "Developer",
      }),
      template({ id: "tester", baseRole: "tester", displayName: "Tester" }),
      template({
        id: "view_only",
        baseRole: "view_only",
        displayName: "View Only",
      }),
    ]);
    assert.ok(options.every((option) => option.baseRole !== "developer"));
    assert.ok(options.every((option) => option.baseRole !== "tester"));
    assert.ok(options.some((option) => option.id === "president"));
    assert.ok(!options.some((option) => option.baseRole === "admin"));
  });

  it("merges event ids without duplicates when adding current event", () => {
    assert.deepEqual(mergeEventAssignmentIds(["a", "b"], "c"), ["a", "b", "c"]);
    assert.deepEqual(mergeEventAssignmentIds(["a", "b"], "a"), ["a", "b"]);
    assert.deepEqual(mergeEventAssignmentIds([], "evt-1"), ["evt-1"]);
  });

  it("formats event context date and initials", () => {
    assert.match(
      formatInviteEventContextDate("2026-08-05"),
      /August 5, 2026/,
    );
    assert.equal(inviteMemberInitials("Jane Smith", "jane@x.com"), "JS");
    assert.equal(inviteMemberInitials("", "jane@x.com"), "JA");
  });
});
