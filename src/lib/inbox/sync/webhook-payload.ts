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

/** Meta sends epoch ms; older payloads occasionally use seconds. */
export function parseMetaWebhookTimestamp(value: unknown): string {
  let numeric: number | null = null;

  if (typeof value === "number" && Number.isFinite(value)) {
    numeric = value;
  } else if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      numeric = parsed;
    }
  }

  if (numeric === null) {
    return new Date().toISOString();
  }

  // Values below 1e12 are seconds (e.g. 1520383572); ms values are 13 digits.
  const epochMs = numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
  return new Date(epochMs).toISOString();
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
