import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  APPROVAL_REMINDER_DELAY_MS,
  isApprovalReminderDue,
  isTrialEndingNoticeDue,
  trialDaysRemaining,
  trialNoticeEntityKey,
} from "../transactional-notification-policy.ts";

describe("transactional notification policy", () => {
  const now = new Date("2026-07-30T12:00:00.000Z");

  it("waits 24 hours before an approval reminder", () => {
    assert.equal(
      isApprovalReminderDue(
        new Date(now.getTime() - APPROVAL_REMINDER_DELAY_MS + 1).toISOString(),
        now,
      ),
      false,
    );
    assert.equal(
      isApprovalReminderDue(
        new Date(now.getTime() - APPROVAL_REMINDER_DELAY_MS).toISOString(),
        now,
      ),
      true,
    );
  });

  it("only sends trial notices for an active trial ending within three days", () => {
    const endingInThreeDays = new Date(
      now.getTime() + 3 * 24 * 60 * 60 * 1000,
    ).toISOString();
    assert.equal(trialDaysRemaining(endingInThreeDays, now), 3);
    assert.equal(
      isTrialEndingNoticeDue({
        subscriptionStatus: "trialing",
        trialEndsAt: endingInThreeDays,
        now,
      }),
      true,
    );
    assert.equal(
      isTrialEndingNoticeDue({
        subscriptionStatus: "active",
        trialEndsAt: endingInThreeDays,
        now,
      }),
      false,
    );
    assert.equal(
      isTrialEndingNoticeDue({
        subscriptionStatus: "trialing",
        trialEndsAt: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        now,
      }),
      false,
    );
  });

  it("keys a trial notice to the exact trial window", () => {
    assert.equal(
      trialNoticeEntityKey("org-1", "2026-08-02T12:00:00.000Z"),
      "org-1:2026-08-02T12:00:00.000Z",
    );
  });
});
