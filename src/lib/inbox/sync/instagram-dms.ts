import { missingInstagramDmScopes } from "@/lib/inbox/scopes";
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
  "id,updated_time,snippet,link,participants{id,name,username}";
const MESSAGE_FIELDS = "id,message,from,created_time";

type ConversationFetchAttempt = {
  path: string;
  label: string;
};

function buildInstagramDmEmptyWarning(input: {
  pageId: string;
  instagramAccountId: string;
  missingScopes: string[];
  attemptedEndpoints: string[];
  lastGraphError: string | null;
}): string {
  if (input.missingScopes.length > 0) {
    return `Missing token scopes: ${input.missingScopes.join(", ")}. Reconnect with inbox permissions.`;
  }

  const parts = [
    "Meta returned 0 Instagram conversations.",
    "Verify the IG Professional account is linked to this Page, Connected tools → Allow Access to Messages is enabled in the Instagram app, and the app has Advanced Access for instagram_manage_messages (Development mode only returns DMs from app admins/testers).",
    `Checked: ${input.attemptedEndpoints.join(", ")} (page ${input.pageId}, IG ${input.instagramAccountId}).`,
  ];

  if (input.lastGraphError) {
    parts.push(`Last Graph error: ${input.lastGraphError}`);
  }

  return parts.join(" ");
}

async function fetchInstagramConversationRecords(input: {
  pageId: string;
  pageAccessToken: string;
}): Promise<{
  conversations: Record<string, unknown>[];
  attemptedEndpoints: string[];
  graphError: string | null;
}> {
  const attempts: ConversationFetchAttempt[] = [
    { path: `/${input.pageId}/conversations`, label: `/${input.pageId}/conversations` },
    { path: "/me/conversations", label: "/me/conversations" },
  ];

  const attemptedEndpoints: string[] = [];
  let lastGraphError: string | null = null;

  for (const attempt of attempts) {
    attemptedEndpoints.push(`${attempt.label}?platform=instagram`);

    const conversationsResult = await inboxGraphGetAllPages(
      attempt.path,
      {
        platform: "instagram",
        fields: CONVERSATION_FIELDS,
        limit: "25",
        access_token: input.pageAccessToken,
      },
      (payload) => asRecordArray(payload.data),
      (payload) => readString(payload.paging && asRecord(payload.paging)?.next) ?? null,
      2,
    );

    if (!conversationsResult.ok) {
      lastGraphError = conversationsResult.error;
      console.warn(
        `Instagram DM conversations fetch failed via ${attempt.label}:`,
        conversationsResult.error,
      );
      continue;
    }

    if (conversationsResult.data.length > 0) {
      console.info(
        `Instagram DM conversations fetched via ${attempt.label}: ${conversationsResult.data.length} thread(s).`,
      );
      return {
        conversations: conversationsResult.data,
        attemptedEndpoints,
        graphError: null,
      };
    }

    console.info(
      `Instagram DM conversations via ${attempt.label} returned 0 threads for page ${input.pageId}.`,
    );
  }

  return {
    conversations: [],
    attemptedEndpoints,
    graphError: lastGraphError,
  };
}

export async function fetchInstagramDirectMessages(input: {
  pageId: string;
  instagramAccountId: string;
  pageAccessToken: string;
  grantedScopes?: string[];
}): Promise<{
  threads: NormalizedInboxThread[];
  messages: NormalizedInboxMessage[];
  error: string | null;
  warning: string | null;
}> {
  const instagramAccountId = input.instagramAccountId.trim();

  if (!instagramAccountId) {
    return {
      threads: [],
      messages: [],
      error: "Instagram account is not linked to this Page.",
      warning: null,
    };
  }

  const missingScopes = missingInstagramDmScopes(input.grantedScopes ?? []);
  if (missingScopes.length > 0) {
    const error = `Missing token scopes for Instagram DMs: ${missingScopes.join(", ")}.`;
    console.warn(`Instagram DM sync blocked for page ${input.pageId}: ${error}`);
    return {
      threads: [],
      messages: [],
      error,
      warning: null,
    };
  }

  const { conversations, attemptedEndpoints, graphError } =
    await fetchInstagramConversationRecords({
      pageId: input.pageId,
      pageAccessToken: input.pageAccessToken,
    });

  if (conversations.length === 0) {
    const warning = buildInstagramDmEmptyWarning({
      pageId: input.pageId,
      instagramAccountId,
      missingScopes,
      attemptedEndpoints,
      lastGraphError: graphError,
    });
    console.warn("Instagram DM sync returned no conversations:", warning);
    return {
      threads: [],
      messages: [],
      error: graphError,
      warning,
    };
  }

  const threads: NormalizedInboxThread[] = [];
  const messages: NormalizedInboxMessage[] = [];
  let messageFetchFailures = 0;

  for (const conversation of conversations) {
    const conversationId = readString(conversation.id);
    if (!conversationId) {
      continue;
    }

    const participants = asRecordArray(
      asRecord(conversation.participants)?.data ?? conversation.participants,
    );
    const participant = participants.find(
      (entry) => readString(entry.id) !== instagramAccountId,
    );
    const participantName =
      readString(participant?.name) ??
      readString(participant?.username) ??
      "Instagram user";
    const participantId = readString(participant?.id);

    const messagesResult = await inboxGraphGet<Record<string, unknown>>(
      `/${conversationId}/messages`,
      {
        fields: MESSAGE_FIELDS,
        limit: "50",
        access_token: input.pageAccessToken,
      },
    );

    if (!messagesResult.ok) {
      messageFetchFailures += 1;
      console.warn(
        `Instagram DM message fetch failed for conversation ${conversationId}:`,
        messagesResult.error,
      );
    }

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
      const direction =
        senderId === instagramAccountId || senderId === input.pageId
          ? "outbound"
          : "inbound";

      if (!lastMessageAt && sentAt) {
        lastMessageAt = sentAt;
      }
      if (!lastSnippet && body) {
        lastSnippet = snippet(body);
      }

      messages.push({
        channelType: "instagram_dm",
        externalThreadId: conversationId,
        externalMessageId,
        direction,
        body: body || "(attachment)",
        senderName,
        senderExternalId: senderId,
        sentAt,
      });
    }

    threads.push({
      channelType: "instagram_dm",
      externalThreadId: conversationId,
      participantName,
      participantExternalId: participantId,
      lastMessageSnippet: lastSnippet,
      lastMessageAt,
      metadata: {
        instagramAccountId,
        link: readString(conversation.link),
      },
    });
  }

  const warning =
    messageFetchFailures > 0
      ? `Fetched ${threads.length} Instagram thread(s) but ${messageFetchFailures} conversation(s) failed to load messages.`
      : null;

  if (warning) {
    console.warn("Instagram DM sync partial success:", warning);
  }

  return { threads, messages, error: null, warning };
}
