import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  fallbackInboxParticipantName,
  isGenericInboxParticipantName,
  preferInboxParticipantName,
} from "@/lib/inbox/sync/participant-identity";

describe("inbox participant identity", () => {
  it("treats User NNNNN and channel defaults as generic", () => {
    assert.equal(isGenericInboxParticipantName("User 947479"), true);
    assert.equal(isGenericInboxParticipantName("user 001"), true);
    assert.equal(isGenericInboxParticipantName("Messenger user"), true);
    assert.equal(isGenericInboxParticipantName("Facebook user"), true);
    assert.equal(isGenericInboxParticipantName("Instagram user"), true);
    assert.equal(isGenericInboxParticipantName(""), true);
    assert.equal(isGenericInboxParticipantName(null), true);
  });

  it("treats real display names as non-generic", () => {
    assert.equal(isGenericInboxParticipantName("Ricardo Hueso"), false);
    assert.equal(isGenericInboxParticipantName("User Name"), false);
    assert.equal(isGenericInboxParticipantName("Ricardo"), false);
  });

  it("never lets a generic webhook label overwrite a real name", () => {
    assert.equal(
      preferInboxParticipantName("Ricardo Hueso", "User 947479"),
      "Ricardo Hueso",
    );
    assert.equal(
      preferInboxParticipantName("Ricardo Hueso", "Messenger user"),
      "Ricardo Hueso",
    );
  });

  it("lets a real sync name replace a generic placeholder", () => {
    assert.equal(
      preferInboxParticipantName("User 947479", "Ricardo Hueso"),
      "Ricardo Hueso",
    );
  });

  it("keeps the best available when both are generic or empty", () => {
    assert.equal(preferInboxParticipantName(null, "User 947479"), "User 947479");
    assert.equal(preferInboxParticipantName("User 111", null), "User 111");
    assert.equal(preferInboxParticipantName(null, null), null);
  });

  it("builds the historical User suffix fallback", () => {
    assert.equal(fallbackInboxParticipantName("123456947479"), "User 947479");
    assert.equal(fallbackInboxParticipantName(null), "Messenger user");
  });
});
