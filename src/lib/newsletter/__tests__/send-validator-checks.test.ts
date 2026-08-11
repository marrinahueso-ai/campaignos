import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  runNewsletterSendChecks,
  type NewsletterSendCheckFacts,
} from "@/lib/newsletter/send-validator-checks";

function baseFacts(): NewsletterSendCheckFacts {
  return {
    hasSendPermission: true,
    status: "approved",
    currentVersionId: "version-1",
    approvedVersionId: "version-1",
    versionAudienceId: "audience-1",
    approvedAudienceId: "audience-1",
    subject: "October updates",
    authorizedSender: { ok: true },
    replyToEmailValid: true,
    hasMailingAddress: true,
    hasComplianceFooter: true,
    canGenerateUnsubscribeTokens: true,
    eligibleRecipientCount: 42,
    productionSendEnabled: true,
    hasDuplicateActiveSend: false,
  };
}

describe("runNewsletterSendChecks", () => {
  it("passes with no errors when every fact is satisfied", () => {
    assert.deepEqual(runNewsletterSendChecks(baseFacts()), []);
  });

  it("fails closed without send permission", () => {
    const errors = runNewsletterSendChecks({ ...baseFacts(), hasSendPermission: false });
    assert.ok(errors.some((e) => e.includes("permission")));
  });

  it("requires approved (or scheduled) status", () => {
    const errors = runNewsletterSendChecks({ ...baseFacts(), status: "draft" });
    assert.ok(errors.some((e) => e.includes("approved before it can be sent")));
  });

  it("allows 'scheduled' status through the status check", () => {
    const errors = runNewsletterSendChecks({ ...baseFacts(), status: "scheduled" });
    assert.equal(errors.some((e) => e.includes("approved before it can be sent")), false);
  });

  it("fails when current version drifted from the approved version", () => {
    const errors = runNewsletterSendChecks({
      ...baseFacts(),
      currentVersionId: "version-2",
    });
    assert.ok(errors.some((e) => e.includes("no longer matches the approved version")));
  });

  it("fails when the audience changed since approval", () => {
    const errors = runNewsletterSendChecks({
      ...baseFacts(),
      versionAudienceId: "audience-2",
    });
    assert.ok(errors.some((e) => e.includes("audience has changed since approval")));
  });

  it("fails on empty subject", () => {
    const errors = runNewsletterSendChecks({ ...baseFacts(), subject: "   " });
    assert.ok(errors.some((e) => e.includes("Subject is required")));
  });

  it("fails on unauthorized sender with the specific error message", () => {
    const errors = runNewsletterSendChecks({
      ...baseFacts(),
      authorizedSender: { ok: false, error: "From address does not match sender profile." },
    });
    assert.ok(errors.includes("From address does not match sender profile."));
  });

  it("fails when production send is disabled", () => {
    const errors = runNewsletterSendChecks({ ...baseFacts(), productionSendEnabled: false });
    assert.ok(errors.some((e) => e.includes("disabled for this environment")));
  });

  it("fails when there are no eligible recipients", () => {
    const errors = runNewsletterSendChecks({ ...baseFacts(), eligibleRecipientCount: 0 });
    assert.ok(errors.some((e) => e.includes("No eligible recipients")));
  });

  it("fails on duplicate active send", () => {
    const errors = runNewsletterSendChecks({ ...baseFacts(), hasDuplicateActiveSend: true });
    assert.ok(errors.some((e) => e.includes("already in progress")));
  });

  it("allows scheduling when production gate is skipped", () => {
    const errors = runNewsletterSendChecks({
      ...baseFacts(),
      productionSendEnabled: false,
      skipProductionGate: true,
    });
    assert.equal(errors.length, 0);
  });

  it("accumulates multiple errors at once", () => {
    const errors = runNewsletterSendChecks({
      ...baseFacts(),
      hasSendPermission: false,
      subject: "",
      productionSendEnabled: false,
    });
    assert.equal(errors.length, 3);
  });
});
