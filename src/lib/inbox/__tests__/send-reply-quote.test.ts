import assert from "node:assert/strict";
import { test } from "node:test";
import { buildMessengerSendParams } from "../messenger-send-params.ts";

test("reply_to is top-level, not nested inside message JSON", () => {
  const params = buildMessengerSendParams({
    recipientId: "psid-1",
    message: { text: "Hello" },
    replyToMid: "m_parent_mid",
    pageAccessToken: "token",
  });

  assert.deepEqual(JSON.parse(params.message), { text: "Hello" });
  assert.equal("reply_to" in JSON.parse(params.message), false);
  assert.deepEqual(JSON.parse(params.reply_to), { mid: "m_parent_mid" });
});

test("local: mids omit reply_to", () => {
  const params = buildMessengerSendParams({
    recipientId: "psid-1",
    message: { text: "Hello" },
    replyToMid: "local:abc",
    pageAccessToken: "token",
  });
  assert.equal(params.reply_to, undefined);
});
