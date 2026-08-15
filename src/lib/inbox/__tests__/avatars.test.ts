import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAvatarMetadata,
  inboxParticipantInitials,
  mergeInboxThreadMetadata,
} from "@/lib/inbox/avatars";

describe("inbox avatars", () => {
  it("builds two-letter initials from display names", () => {
    assert.equal(inboxParticipantInitials("Ricardo Hueso"), "RH");
    assert.equal(inboxParticipantInitials("Ricardo"), "RI");
    assert.equal(inboxParticipantInitials(null), "?");
    assert.equal(inboxParticipantInitials("  "), "?");
  });

  it("preserves existing avatar URLs when incoming omits or blanks them", () => {
    const existing = {
      participant_avatar_url: "https://platform-lookaside.fbsbx.com/a.jpg",
      page_avatar_url: "https://platform-lookaside.fbsbx.com/page.jpg",
    };
    const merged = mergeInboxThreadMetadata(existing, {
      other: true,
      participant_avatar_url: null,
      page_avatar_url: "",
    });

    assert.equal(
      merged.participant_avatar_url,
      "https://platform-lookaside.fbsbx.com/a.jpg",
    );
    assert.equal(
      merged.page_avatar_url,
      "https://platform-lookaside.fbsbx.com/page.jpg",
    );
    assert.equal(merged.other, true);
  });

  it("lets a real incoming avatar replace an existing one", () => {
    const merged = mergeInboxThreadMetadata(
      { participant_avatar_url: "https://old.example/a.jpg" },
      buildAvatarMetadata({
        participantAvatarUrl: "https://platform-lookaside.fbsbx.com/new.jpg",
      }),
    );
    assert.equal(
      merged.participant_avatar_url,
      "https://platform-lookaside.fbsbx.com/new.jpg",
    );
  });
});
