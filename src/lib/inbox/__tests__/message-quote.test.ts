import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildQuotedSnippet,
  readQuotedMessagePreview,
} from "../message-quote.ts";
import type { InboxMessage } from "../types.ts";

function baseMessage(
  overrides: Partial<InboxMessage> & { body: string },
): InboxMessage {
  return {
    id: "msg-1",
    organizationId: "org-1",
    threadId: "thread-1",
    channelType: "facebook_message",
    externalMessageId: "m_abc",
    direction: "inbound",
    senderName: "Ricardo",
    senderExternalId: "psid",
    sentAt: null,
    status: "pending",
    aiDraftBody: null,
    aiDraftGeneratedAt: null,
    aiSourceUsed: null,
    approvedBody: null,
    approvedAt: null,
    approvedByUserId: null,
    sentToPlatformAt: null,
    externalSendId: null,
    metadata: {},
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

test("buildQuotedSnippet uses body text", () => {
  assert.equal(
    buildQuotedSnippet(
      baseMessage({ body: "Looking for volunteer opportunities" }),
    ),
    "Looking for volunteer opportunities",
  );
});

test("buildQuotedSnippet uses GIF label for attachment placeholders", () => {
  assert.equal(
    buildQuotedSnippet(
      baseMessage({
        body: "📎 GIF",
        metadata: {
          stickerUrl: "https://cdn.example/a.gif",
          giphyUrl: "https://cdn.example/a.gif",
        },
      }),
    ),
    "GIF",
  );
});

test("readQuotedMessagePreview reads outbound quote metadata", () => {
  assert.deepEqual(
    readQuotedMessagePreview({
      quotedMessageId: "parent-1",
      quotedSnippet: "volunteer opportunities",
      quotedSenderName: "Ricardo Hueso",
    }),
    {
      quotedMessageId: "parent-1",
      snippet: "volunteer opportunities",
      senderName: "Ricardo Hueso",
    },
  );
});

test("readQuotedMessagePreview returns null without quote fields", () => {
  assert.equal(readQuotedMessagePreview({ stickerUrl: "https://x" }), null);
});
