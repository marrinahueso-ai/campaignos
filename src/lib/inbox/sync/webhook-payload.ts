import crypto from "crypto";

/** Coerce Meta webhook IDs (string or number) to a trimmed string. */
export function readMetaId(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

/** Meta sends epoch ms; older payloads occasionally use seconds. Also accepts ISO strings. */
export function parseMetaWebhookTimestamp(value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    const trimmed = value.trim();
    // Graph comment/post created_time is often an ISO-8601 string.
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const parsedIso = Date.parse(trimmed);
      if (Number.isFinite(parsedIso)) {
        return new Date(parsedIso).toISOString();
      }
    }

    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      const epochMs = parsed < 1_000_000_000_000 ? parsed * 1000 : parsed;
      return new Date(epochMs).toISOString();
    }

    return new Date().toISOString();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const epochMs = value < 1_000_000_000_000 ? value * 1000 : value;
    return new Date(epochMs).toISOString();
  }

  return new Date().toISOString();
}

export function collectMessagingEventsFromEntry(
  entry: Record<string, unknown>,
): { events: Record<string, unknown>[]; sources: ("messaging" | "standby")[] } {
  const events: Record<string, unknown>[] = [];
  const sources: ("messaging" | "standby")[] = [];

  for (const source of ["messaging", "standby"] as const) {
    const batch = entry[source];
    if (!Array.isArray(batch)) {
      continue;
    }

    for (const event of batch) {
      if (typeof event === "object" && event !== null) {
        events.push(event as Record<string, unknown>);
        sources.push(source);
      }
    }
  }

  return { events, sources };
}

export function verifyMetaWebhookSignatureWithSecret(input: {
  rawBody: string;
  signatureHeader: string | null;
  appSecret: string;
}): boolean {
  if (!input.appSecret || !input.signatureHeader?.startsWith("sha256=")) {
    return false;
  }

  const expected = `sha256=${crypto
    .createHmac("sha256", input.appSecret)
    .update(input.rawBody, "utf8")
    .digest("hex")}`;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(input.signatureHeader),
    );
  } catch {
    return false;
  }
}

export function describeMessagingSkipReason(
  messagingEvent: Record<string, unknown>,
): string {
  const message = messagingEvent.message;
  if (!message || typeof message !== "object") {
    if (messagingEvent.postback) {
      return "postback_event";
    }
    if (messagingEvent.read) {
      return "read_receipt";
    }
    if (messagingEvent.delivery) {
      return "delivery_receipt";
    }
    return "missing_message_object";
  }

  const messageRecord = message as Record<string, unknown>;
  const externalMessageId =
    typeof messageRecord.mid === "string"
      ? messageRecord.mid
      : typeof messageRecord.id === "string"
        ? messageRecord.id
        : null;

  if (!externalMessageId) {
    return "missing_message_id";
  }

  return "unknown";
}

/**
 * Page `feed` comment webhooks are inconsistent: photo/status comments often
 * omit `post_id` and `from`, sending `parent_id` + `sender_id` instead.
 * IDs may also arrive as numbers for simple numeric values.
 */
export type ParsedFeedCommentChange = {
  commentId: string;
  postId: string;
  message: string;
  senderName: string;
  senderId: string | null;
  createdTimeIso: string;
  verb: string | null;
  shouldPersist: boolean;
  skipReason: string | null;
};

function readFeedSenderName(value: Record<string, unknown>): string {
  const from = value.from;
  if (from && typeof from === "object") {
    const name = (from as Record<string, unknown>).name;
    if (typeof name === "string" && name.trim()) {
      return name.trim();
    }
  }

  if (typeof value.sender_name === "string" && value.sender_name.trim()) {
    return value.sender_name.trim();
  }

  return "Facebook user";
}

function readFeedSenderId(value: Record<string, unknown>): string | null {
  const from = value.from;
  if (from && typeof from === "object") {
    const fromId = readMetaId((from as Record<string, unknown>).id);
    if (fromId) {
      return fromId;
    }
  }

  return readMetaId(value.sender_id);
}

/** Prefer post_id; photo comments often only include parent_id (= post for top-level). */
export function resolveFeedCommentPostId(
  value: Record<string, unknown>,
): string | null {
  return readMetaId(value.post_id) ?? readMetaId(value.parent_id);
}

export function parseFeedCommentChange(
  value: Record<string, unknown>,
): ParsedFeedCommentChange {
  const item = typeof value.item === "string" ? value.item : "";
  const verb = typeof value.verb === "string" ? value.verb.toLowerCase() : null;
  const commentId = readMetaId(value.comment_id);
  const postId = resolveFeedCommentPostId(value);
  const message = typeof value.message === "string" ? value.message : "";
  const senderName = readFeedSenderName(value);
  const senderId = readFeedSenderId(value);
  const createdTimeIso = parseMetaWebhookTimestamp(value.created_time);

  if (item && item !== "comment") {
    return {
      commentId: commentId ?? "",
      postId: postId ?? "",
      message,
      senderName,
      senderId,
      createdTimeIso,
      verb,
      shouldPersist: false,
      skipReason: `non_comment_item:${item}`,
    };
  }

  if (verb && (verb === "remove" || verb === "delete" || verb === "hide")) {
    return {
      commentId: commentId ?? "",
      postId: postId ?? "",
      message,
      senderName,
      senderId,
      createdTimeIso,
      verb,
      shouldPersist: false,
      skipReason: `ignored_verb:${verb}`,
    };
  }

  if (!commentId) {
    return {
      commentId: "",
      postId: postId ?? "",
      message,
      senderName,
      senderId,
      createdTimeIso,
      verb,
      shouldPersist: false,
      skipReason: "missing_comment_id",
    };
  }

  if (!postId) {
    return {
      commentId,
      postId: "",
      message,
      senderName,
      senderId,
      createdTimeIso,
      verb,
      shouldPersist: false,
      skipReason: "missing_post_or_parent_id",
    };
  }

  // Empty `item` with comment_id is treated as a comment (some photo payloads).
  return {
    commentId,
    postId,
    message,
    senderName,
    senderId,
    createdTimeIso,
    verb,
    shouldPersist: true,
    skipReason: null,
  };
}
