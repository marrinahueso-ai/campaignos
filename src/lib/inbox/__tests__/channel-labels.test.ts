import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  INBOX_CHANNEL_LABELS,
  INBOX_CHANNEL_SHORT_LABELS,
  isTaggedChannel,
} from "@/lib/inbox/constants";

describe("inbox channel taxonomy — Tag ≠ Mention", () => {
  it("labels photo/media tags as Tag, not Mention", () => {
    assert.equal(INBOX_CHANNEL_LABELS.instagram_tag, "Instagram Tag");
    assert.equal(INBOX_CHANNEL_LABELS.facebook_tag, "Facebook Tag");
    assert.equal(INBOX_CHANNEL_SHORT_LABELS.instagram_tag, "IG Tag");
    assert.equal(INBOX_CHANNEL_SHORT_LABELS.facebook_tag, "FB Tag");
    assert.doesNotMatch(INBOX_CHANNEL_LABELS.instagram_tag, /Mention/i);
    assert.doesNotMatch(INBOX_CHANNEL_LABELS.facebook_tag, /Mention/i);
  });

  it("isTaggedChannel covers only tag channels", () => {
    assert.equal(isTaggedChannel("instagram_tag"), true);
    assert.equal(isTaggedChannel("facebook_tag"), true);
    assert.equal(isTaggedChannel("instagram_comment"), false);
    assert.equal(isTaggedChannel("facebook_message"), false);
  });
});
