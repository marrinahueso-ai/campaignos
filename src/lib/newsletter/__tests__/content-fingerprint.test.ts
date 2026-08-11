import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  approvalInvalidatingFieldsChanged,
  computeNewsletterContentFingerprint,
  contentFingerprintMatches,
  type NewsletterFingerprintInput,
} from "@/lib/newsletter/content-fingerprint";
import { buildInitialState } from "@/lib/newsletter-composer/defaults";

// `buildInitialState` assigns random ids (e.g. sponsor id) on every call, so
// build the composer state fixture once and deep-clone it for each test to
// keep fingerprints comparable across separate `baseInput()` calls.
const composerStateFixture = buildInitialState("Riverside PTA", []);

function baseInput(): NewsletterFingerprintInput {
  return {
    composerState: JSON.parse(JSON.stringify(composerStateFixture)),
    subject: "October updates",
    fromDisplayName: "Riverside PTA",
    fromEmail: "newsletter@heyralli.com",
    replyToEmail: "board@riversidepta.org",
    audienceId: "audience-1",
    proposedSendAt: "2026-10-15T15:00:00.000Z",
  };
}

describe("computeNewsletterContentFingerprint", () => {
  it("is stable for identical input", () => {
    const a = computeNewsletterContentFingerprint(baseInput());
    const b = computeNewsletterContentFingerprint(baseInput());
    assert.equal(a, b);
  });

  it("is order-independent (same content, different key order)", () => {
    const input = baseInput();
    const reordered: NewsletterFingerprintInput = {
      audienceId: input.audienceId,
      replyToEmail: input.replyToEmail,
      fromEmail: input.fromEmail,
      fromDisplayName: input.fromDisplayName,
      subject: input.subject,
      composerState: input.composerState,
      proposedSendAt: input.proposedSendAt,
    };
    assert.equal(
      computeNewsletterContentFingerprint(input),
      computeNewsletterContentFingerprint(reordered),
    );
  });

  it("normalizes casing/whitespace for emails and subject", () => {
    const input = baseInput();
    const messy: NewsletterFingerprintInput = {
      ...input,
      fromEmail: `  ${input.fromEmail.toUpperCase()}  `,
      replyToEmail: `  ${input.replyToEmail.toUpperCase()}  `,
      subject: `  ${input.subject}  `,
    };
    assert.equal(
      computeNewsletterContentFingerprint(input),
      computeNewsletterContentFingerprint(messy),
    );
  });
});

describe("approvalInvalidatingFieldsChanged", () => {
  it("proposed send datetime changes DO invalidate", () => {
    const approved = baseInput();
    const rescheduled = {
      ...baseInput(),
      proposedSendAt: "2026-10-16T15:00:00.000Z",
    };
    assert.equal(approvalInvalidatingFieldsChanged(approved, rescheduled), true);
  });

  it("identical proposed send datetime does not invalidate", () => {
    const approved = baseInput();
    const same = baseInput();
    assert.equal(approvalInvalidatingFieldsChanged(approved, same), false);
  });

  it("test-send-only activity does not invalidate (fingerprint input has no send-kind field)", () => {
    const approved = baseInput();
    const afterTestSend = baseInput();
    assert.equal(approvalInvalidatingFieldsChanged(approved, afterTestSend), false);
  });

  it("subject change invalidates", () => {
    const approved = baseInput();
    const edited = { ...approved, subject: "November updates" };
    assert.equal(approvalInvalidatingFieldsChanged(approved, edited), true);
  });

  it("audience change invalidates", () => {
    const approved = baseInput();
    const edited = { ...approved, audienceId: "audience-2" };
    assert.equal(approvalInvalidatingFieldsChanged(approved, edited), true);
  });

  it("from email change invalidates", () => {
    const approved = baseInput();
    const edited = { ...approved, fromEmail: "other@heyralli.com" };
    assert.equal(approvalInvalidatingFieldsChanged(approved, edited), true);
  });

  it("reply-to change invalidates", () => {
    const approved = baseInput();
    const edited = { ...approved, replyToEmail: "someone-else@riversidepta.org" };
    assert.equal(approvalInvalidatingFieldsChanged(approved, edited), true);
  });

  it("story/body content change invalidates", () => {
    const approved = baseInput();
    const edited: NewsletterFingerprintInput = {
      ...approved,
      composerState: {
        ...approved.composerState,
        leadershipMessage: "Completely different message this month.",
      },
    };
    assert.equal(approvalInvalidatingFieldsChanged(approved, edited), true);
  });

  it("layout order change invalidates", () => {
    const approved = baseInput();
    const edited: NewsletterFingerprintInput = {
      ...approved,
      composerState: {
        ...approved.composerState,
        layoutBlocks: [...approved.composerState.layoutBlocks].reverse(),
      },
    };
    assert.equal(approvalInvalidatingFieldsChanged(approved, edited), true);
  });
});

describe("contentFingerprintMatches", () => {
  it("matches a previously stored fingerprint for identical content", () => {
    const input = baseInput();
    const stored = computeNewsletterContentFingerprint(input);
    assert.equal(contentFingerprintMatches(baseInput(), stored), true);
  });

  it("does not match after an invalidating edit", () => {
    const input = baseInput();
    const stored = computeNewsletterContentFingerprint(input);
    assert.equal(
      contentFingerprintMatches({ ...input, subject: "Changed" }, stored),
      false,
    );
  });
});
