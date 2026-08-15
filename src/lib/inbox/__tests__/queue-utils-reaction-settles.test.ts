import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyThreadQueueState } from "@/lib/inbox/queue-utils";
import type { InboxMessage, InboxThread } from "@/lib/inbox/types";

function thread(overrides: Partial<InboxThread> = {}): InboxThread {
  return {
    id: "thread-1",
    organizationId: "org-1",
    channelType: "facebook_comment",
    externalThreadId: "ext-1",
    externalPostId: "post-1",
    participantName: "Ricardo Hueso",
    participantExternalId: "psid",
    participantAvatarUrl: null,
    pageAvatarUrl: null,
    subject: "hello",
    lastMessageSnippet: "hello",
    lastMessageAt: "2026-08-15T18:19:00.000Z",
    unreadCount: 1,
    status: "pending",
    followUp: false,
    markedDone: false,
    assignedUserId: null,
    assigneeName: null,
    assigneeInitials: null,
    syncedAt: null,
    metadata: {},
    createdAt: "2026-08-15T18:19:00.000Z",
    updatedAt: "2026-08-15T18:19:00.000Z",
    ...overrides,
  };
}

function message(overrides: Partial<InboxMessage> = {}): InboxMessage {
  return {
    id: "msg-1",
    organizationId: "org-1",
    threadId: "thread-1",
    channelType: "facebook_comment",
    externalMessageId: "mid-1",
    direction: "inbound",
    body: "hello",
    senderName: "Ricardo Hueso",
    senderExternalId: "psid",
    sentAt: "2026-08-15T18:19:00.000Z",
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
    createdAt: "2026-08-15T18:19:00.000Z",
    updatedAt: "2026-08-15T18:19:00.000Z",
    ...overrides,
  };
}

describe("classifyThreadQueueState — Page reactions", () => {
  it("marks pending inbound comments as Needs Reply without a reaction", () => {
    const state = classifyThreadQueueState(thread(), [message()]);
    assert.equal(state.needsReply, true);
  });

  it("clears Needs Reply when the reply target has a Page 👍 reaction", () => {
    const state = classifyThreadQueueState(thread(), [
      message({ metadata: { localReaction: "👍", metaReaction: "LIKE" } }),
    ]);
    assert.equal(state.needsReply, false);
    assert.equal(state.readyToSend, false);
  });

  it("clears Ready to Send when an approved draft was reacted instead of sent", () => {
    const state = classifyThreadQueueState(thread(), [
      message({
        status: "approved",
        approvedBody: "Thanks!",
        metadata: { localReaction: "❤️", metaReaction: "LIKE" },
      }),
    ]);
    assert.equal(state.needsReply, false);
    assert.equal(state.readyToSend, false);
  });
});
