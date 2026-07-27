import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_ACCOUNT_NOTIFICATION_PREFERENCES,
  isApprovalNeedsAttentionType,
  normalizeAccountNotificationPreferences,
} from "../account-notification-prefs.ts";

describe("account notification preferences", () => {
  it("defaults empty objects to mockup defaults (on, on, off)", () => {
    assert.deepEqual(
      normalizeAccountNotificationPreferences({}),
      DEFAULT_ACCOUNT_NOTIFICATION_PREFERENCES,
    );
    assert.deepEqual(
      normalizeAccountNotificationPreferences(null),
      DEFAULT_ACCOUNT_NOTIFICATION_PREFERENCES,
    );
  });

  it("preserves explicit false / true toggles", () => {
    assert.deepEqual(
      normalizeAccountNotificationPreferences({
        approvalNeedsAttention: false,
        inboxFollowUps: false,
        weeklySummaryEmail: true,
      }),
      {
        approvalNeedsAttention: false,
        inboxFollowUps: false,
        weeklySummaryEmail: true,
      },
    );
  });

  it("treats approval assigned / resubmitted / change requested as needs-attention", () => {
    assert.equal(isApprovalNeedsAttentionType("approval_assigned"), true);
    assert.equal(isApprovalNeedsAttentionType("approval_resubmitted"), true);
    assert.equal(isApprovalNeedsAttentionType("change_requested"), true);
    assert.equal(isApprovalNeedsAttentionType("content_approved"), false);
    assert.equal(isApprovalNeedsAttentionType("scheduled_delivery"), false);
  });
});
