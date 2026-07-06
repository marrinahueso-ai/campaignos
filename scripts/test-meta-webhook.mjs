#!/usr/bin/env node
/**
 * Smoke tests for Meta webhook payload parsing (run: node scripts/test-meta-webhook.mjs)
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  collectMessagingEventsFromEntry,
  parseMetaWebhookTimestamp,
  readMetaId,
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

console.log("Meta webhook payload tests passed.");
