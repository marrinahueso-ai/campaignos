#!/usr/bin/env node
/**
 * Smoke tests for Meta webhook payload parsing (run: node scripts/test-meta-webhook.mjs)
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  collectMessagingEventsFromEntry,
  parseFeedCommentChange,
  parseMetaWebhookTimestamp,
  readMetaId,
  resolveFeedCommentPostId,
  verifyMetaWebhookSignatureWithSecret,
} from "../src/lib/inbox/sync/webhook-payload.ts";

const samplePagePayload = {
  object: "page",
  entry: [
    {
      id: "123456789",
      time: 1520383572,
      messaging: [
        {
          sender: { id: "USER_PSID" },
          recipient: { id: "123456789" },
          timestamp: 1520383572000,
          message: {
            mid: "mid.$sample",
            text: "Hello from Messenger",
          },
        },
      ],
    },
  ],
};

assert.equal(readMetaId(123456789), "123456789");
assert.equal(readMetaId(" 123 "), "123");

const msTs = parseMetaWebhookTimestamp(1520383572000);
assert.match(msTs, /^2018-/);

const secTs = parseMetaWebhookTimestamp(1520383572);
assert.match(secTs, /^2018-/);

const entry = samplePagePayload.entry[0];
const { events, sources } = collectMessagingEventsFromEntry(entry);
assert.equal(events.length, 1);
assert.deepEqual(sources, ["messaging"]);

const standbyEntry = {
  id: "123456789",
  standby: [
    {
      sender: { id: "USER_PSID" },
      recipient: { id: "123456789" },
      timestamp: 1520383572000,
      message: { mid: "mid.$standby", text: "Standby message" },
    },
  ],
};
const standbyCollected = collectMessagingEventsFromEntry(standbyEntry);
assert.equal(standbyCollected.events.length, 1);
assert.deepEqual(standbyCollected.sources, ["standby"]);

const sampleInstagramPayload = {
  object: "instagram",
  entry: [
    {
      id: "17841480109670002",
      time: Date.now(),
      messaging: [
        {
          sender: { id: "IGSID_USER" },
          recipient: { id: "17841480109670002" },
          timestamp: Date.now(),
          message: { mid: "mid.$ig.sample", text: "Hello from Instagram" },
        },
      ],
    },
  ],
};
const igEntry = sampleInstagramPayload.entry[0];
const igCollected = collectMessagingEventsFromEntry(igEntry);
assert.equal(igCollected.events.length, 1);
assert.equal(sampleInstagramPayload.object, "instagram");

const secret = "test-app-secret";
const body = JSON.stringify(samplePagePayload);
const signature = `sha256=${crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;
assert.equal(
  verifyMetaWebhookSignatureWithSecret({
    rawBody: body,
    signatureHeader: signature,
    appSecret: secret,
  }),
  true,
);
assert.equal(
  verifyMetaWebhookSignatureWithSecret({
    rawBody: body,
    signatureHeader: "sha256=deadbeef",
    appSecret: secret,
  }),
  false,
);

const sparsePhotoComment = {
  item: "comment",
  verb: "add",
  comment_id: "122120917863387536_1336063851845687",
  parent_id: "1252891557897483_122120917863387536",
  sender_id: "27810140111947479",
  created_time: 1786817963,
};
assert.equal(
  resolveFeedCommentPostId(sparsePhotoComment),
  "1252891557897483_122120917863387536",
);
const sparseParsed = parseFeedCommentChange(sparsePhotoComment);
assert.equal(sparseParsed.shouldPersist, true);
assert.equal(sparseParsed.commentId, "122120917863387536_1336063851845687");
assert.equal(sparseParsed.postId, "1252891557897483_122120917863387536");
assert.equal(sparseParsed.senderId, "27810140111947479");
assert.equal(sparseParsed.senderName, "Facebook user");
assert.match(sparseParsed.createdTimeIso, /^2026-08-15T/);

const fullComment = {
  item: "comment",
  verb: "add",
  comment_id: "122120917863387536_1336063851845687",
  post_id: "1252891557897483_122120917863387536",
  parent_id: "1252891557897483_122120917863387536",
  message: "hello",
  from: { id: "27810140111947479", name: "Ricardo Hueso" },
  created_time: "2026-08-15T18:19:23+0000",
};
const fullParsed = parseFeedCommentChange(fullComment);
assert.equal(fullParsed.shouldPersist, true);
assert.equal(fullParsed.message, "hello");
assert.equal(fullParsed.senderName, "Ricardo Hueso");
assert.equal(fullParsed.createdTimeIso, "2026-08-15T18:19:23.000Z");

const reaction = parseFeedCommentChange({
  item: "reaction",
  verb: "add",
  post_id: "1252891557897483_1",
  reaction_type: "like",
});
assert.equal(reaction.shouldPersist, false);
assert.match(reaction.skipReason ?? "", /^non_comment_item:/);

const removed = parseFeedCommentChange({
  item: "comment",
  verb: "remove",
  comment_id: "1_2",
  post_id: "page_1",
});
assert.equal(removed.shouldPersist, false);

console.log("Meta webhook payload tests passed.");
