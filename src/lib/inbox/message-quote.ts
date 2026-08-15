import type { InboxMessage } from "./types";

const IMAGE_PLACEHOLDER_BODIES = new Set(["📎 Sticker", "📎 GIF"]);

function readStickerUrl(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  if (!metadata) {
    return null;
  }
  const url = metadata.stickerUrl;
  return typeof url === "string" && url.trim() ? url.trim() : null;
}

/** Label for attachment-only messages used in composer / bubble quote previews. */
export function quotedAttachmentLabel(message: InboxMessage): string | null {
  const stickerUrl = readStickerUrl(message.metadata);
  if (!stickerUrl) {
    return null;
  }
  if (message.metadata?.giphyUrl) {
    return "GIF";
  }
  return "Sticker";
}

/** Snippet text stored on outbound replies that quote another timeline message. */
export function buildQuotedSnippet(message: InboxMessage): string {
  const body = message.body?.trim() ?? "";
  if (body && !IMAGE_PLACEHOLDER_BODIES.has(body)) {
    return body.slice(0, 160);
  }
  return quotedAttachmentLabel(message) ?? "Attachment";
}

export type QuotedMessagePreview = {
  quotedMessageId: string;
  snippet: string;
  senderName: string | null;
};

/** Reads Messenger-style quote metadata from a sent (or inbound) message. */
export function readQuotedMessagePreview(
  metadata: Record<string, unknown> | null | undefined,
): QuotedMessagePreview | null {
  if (!metadata) {
    return null;
  }
  const quotedMessageId =
    typeof metadata.quotedMessageId === "string"
      ? metadata.quotedMessageId.trim()
      : "";
  const snippet =
    typeof metadata.quotedSnippet === "string"
      ? metadata.quotedSnippet.trim()
      : "";
  if (!quotedMessageId && !snippet) {
    return null;
  }
  const senderName =
    typeof metadata.quotedSenderName === "string" &&
    metadata.quotedSenderName.trim()
      ? metadata.quotedSenderName.trim()
      : null;
  return {
    quotedMessageId: quotedMessageId || "unknown",
    snippet: snippet || "Message",
    senderName,
  };
}
