import {
  asRecord,
  asRecordArray,
  inboxGraphGet,
  inboxGraphGetAllPages,
  readIsoTime,
  readString,
  snippet,
} from "@/lib/inbox/sync/graph-client";
import type { NormalizedInboxMessage, NormalizedInboxThread } from "@/lib/inbox/sync/types";

const CONVERSATION_FIELDS =
  "id,updated_time,snippet,link,participants{id,name,username,email}";
const MESSAGE_FIELDS = "id,message,from,created_time";

export async function fetchFacebookPageMessages(input: {
  pageId: string;
  pageAccessToken: string;
  pageName?: string | null;
}): Promise<{
  threads: NormalizedInboxThread[];
  messages: NormalizedInboxMessage[];
  error: string | null;
}> {
  const conversationsResult = await inboxGraphGetAllPages(
    `/${input.pageId}/conversations`,
    {
      platform: "messenger",
      fields: CONVERSATION_FIELDS,
      limit: "25",
      access_token: input.pageAccessToken,
    },
    (payload) => asRecordArray(payload.data),
    (payload) => readString(payload.paging && asRecord(payload.paging)?.next) ?? null,
    2,
  );

  if (!conversationsResult.ok) {
    return { threads: [], messages: [], error: conversationsResult.error };
  }

  const threads: NormalizedInboxThread[] = [];
  const messages: NormalizedInboxMessage[] = [];

  for (const conversation of conversationsResult.data) {
    const conversationId = readString(conversation.id);
    if (!conversationId) {
      continue;
    }

    const participants = asRecordArray(
      asRecord(conversation.participants)?.data ?? conversation.participants,
    );
    const participant = participants.find((entry) => readString(entry.id) !== input.pageId);
    const participantName =
      readString(participant?.name) ??
      readString(participant?.username) ??
      readString(participant?.email) ??
      "Facebook user";
    const participantId = readString(participant?.id);

    const messagesResult = await inboxGraphGet<Record<string, unknown>>(
      `/${conversationId}/messages`,
      {
        fields: MESSAGE_FIELDS,
        limit: "50",
        access_token: input.pageAccessToken,
      },
    );

    const conversationMessages = messagesResult.ok
      ? asRecordArray(messagesResult.data.data)
      : [];

    let lastMessageAt = readIsoTime(conversation.updated_time);
    let lastSnippet = readString(conversation.snippet);

    for (const message of conversationMessages) {
      const externalMessageId = readString(message.id);
      const body = readString(message.message) ?? "";
      if (!externalMessageId) {
        continue;
      }

      const from = asRecord(message.from);
      const senderId = readString(from?.id);
      const senderName = readString(from?.name) ?? readString(from?.username);
      const sentAt = readIsoTime(message.created_time);
      const direction = senderId === input.pageId ? "outbound" : "inbound";

      if (!lastMessageAt && sentAt) {
        lastMessageAt = sentAt;
      }
      if (!lastSnippet && body) {
        lastSnippet = snippet(body);
      }

      messages.push({
        channelType: "facebook_message",
        externalThreadId: conversationId,
        externalMessageId,
        direction,
        body: body || "(attachment)",
        senderName,
        senderExternalId: senderId,
        sentAt,
        metadata: {
          link: readString(conversation.link),
        },
      });
    }

    threads.push({
      channelType: "facebook_message",
      externalThreadId: conversationId,
      participantName,
      participantExternalId: participantId,
      lastMessageSnippet: lastSnippet,
      lastMessageAt,
      metadata: {
        pageName: input.pageName ?? null,
        link: readString(conversation.link),
      },
    });
  }

  return { threads, messages, error: null };
}
