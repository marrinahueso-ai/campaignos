/**
 * Helpers for Messenger/IG DM contact display names.
 *
 * Webhooks often lack a profile name and historically used `User {PSID suffix}`.
 * That placeholder must never overwrite a real name from Graph sync.
 */

const GENERIC_LABELS = new Set([
  "messenger user",
  "facebook user",
  "instagram user",
]);

/** True for empty or synthetic labels like "User 947479" / "Messenger user". */
export function isGenericInboxParticipantName(
  name: string | null | undefined,
): boolean {
  const trimmed = name?.trim();
  if (!trimmed) {
    return true;
  }

  if (GENERIC_LABELS.has(trimmed.toLowerCase())) {
    return true;
  }

  return /^User \d+$/i.test(trimmed);
}

/**
 * Prefer a real display name over a generic placeholder.
 * Incoming real names win; otherwise keep an existing real name.
 */
export function preferInboxParticipantName(
  existing: string | null | undefined,
  incoming: string | null | undefined,
): string | null {
  const incomingTrim = incoming?.trim() || null;
  const existingTrim = existing?.trim() || null;

  if (incomingTrim && !isGenericInboxParticipantName(incomingTrim)) {
    return incomingTrim;
  }
  if (existingTrim && !isGenericInboxParticipantName(existingTrim)) {
    return existingTrim;
  }

  return incomingTrim ?? existingTrim;
}

/** Synthetic label used when Graph has not returned a name yet. */
export function fallbackInboxParticipantName(
  participantId: string | null | undefined,
): string {
  if (participantId?.trim()) {
    return `User ${participantId.trim().slice(-6)}`;
  }
  return "Messenger user";
}
