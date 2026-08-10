import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildNewsletterMilestoneId,
  isNewsletterMilestoneId,
  newsletterDetailHref,
} from "@/lib/newsletter/approval";
import {
  approvalInvalidatingFieldsChanged,
  computeNewsletterContentFingerprint,
  type NewsletterFingerprintInput,
} from "@/lib/newsletter/content-fingerprint";
import { resolveContactReimportAction } from "@/lib/newsletter/contact-reimport";
import { runNewsletterSendChecks } from "@/lib/newsletter/send-validator-checks";
import type { NewsletterComposerState } from "@/lib/newsletter-composer/types";

const emptyComposer = {
  subject: "Spring Fair",
  stories: [],
} as unknown as NewsletterComposerState;

function fp(
  overrides: Partial<NewsletterFingerprintInput> = {},
): NewsletterFingerprintInput {
  return {
    composerState: emptyComposer,
    subject: "Spring Fair",
    fromDisplayName: "PTO",
    fromEmail: "news@example.com",
    replyToEmail: "reply@example.com",
    audienceId: "aud-1",
    ...overrides,
  };
}

describe("newsletter tenancy & safety contracts (pure)", () => {
  it("scopes milestone ids to newsletter namespace", () => {
    const id = buildNewsletterMilestoneId("11111111-1111-1111-1111-111111111111");
    assert.equal(id.startsWith("newsletter:"), true);
    assert.equal(isNewsletterMilestoneId(id), true);
    assert.equal(isNewsletterMilestoneId("flyer-composer:abc"), false);
    assert.equal(
      newsletterDetailHref("11111111-1111-1111-1111-111111111111"),
      "/newsletters/11111111-1111-1111-1111-111111111111",
    );
  });

  it("keeps the same fingerprint when only proposed send time would change (excluded from hash)", () => {
    // proposedSendAt is intentionally not part of NewsletterFingerprintInput.
    const a = computeNewsletterContentFingerprint(fp());
    const b = computeNewsletterContentFingerprint(fp());
    assert.equal(a, b);
    assert.equal(approvalInvalidatingFieldsChanged(fp(), fp()), false);
  });

  it("invalidates approval when audience changes", () => {
    assert.equal(
      approvalInvalidatingFieldsChanged(fp({ audienceId: "aud-1" }), fp({ audienceId: "aud-2" })),
      true,
    );
  });

  it("invalidates approval when subject changes", () => {
    assert.equal(
      approvalInvalidatingFieldsChanged(fp({ subject: "A" }), fp({ subject: "B" })),
      true,
    );
  });

  it("never reactivates unsubscribed contacts on re-import", () => {
    const result = resolveContactReimportAction(
      { status: "unsubscribed", firstName: "Pat", lastName: "Lee" },
      { firstName: "Patricia", lastName: "Lee" },
    );
    assert.equal(result.kind, "keep_locked");
    if (result.kind === "keep_locked") {
      assert.equal(result.status, "unsubscribed");
    }
  });

  it("blocks send without permission, approval, or matching version", () => {
    const errors = runNewsletterSendChecks({
      hasSendPermission: false,
      status: "draft",
      currentVersionId: "v1",
      approvedVersionId: "v2",
      versionAudienceId: "a1",
      approvedAudienceId: "a1",
      subject: "Hi",
      authorizedSender: { ok: true },
      replyToEmailValid: true,
      hasMailingAddress: true,
      hasComplianceFooter: true,
      canGenerateUnsubscribeTokens: true,
      eligibleRecipientCount: 10,
      productionSendEnabled: true,
      hasDuplicateActiveSend: false,
    });
    assert.ok(errors.some((e) => /permission/i.test(e)));
    assert.ok(errors.some((e) => /approv/i.test(e)));
    assert.ok(errors.some((e) => /version/i.test(e)));
  });
});
