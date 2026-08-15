import { getInboxPlatform } from "@/lib/inbox/constants";
import type { InboxChannelType } from "@/lib/inbox/types";

export const INBOX_AVATAR_METADATA_KEYS = {
  participant: "participant_avatar_url",
  page: "page_avatar_url",
  instagram: "instagram_avatar_url",
} as const;

function readMetadataUrl(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function readParticipantAvatarUrl(metadata: Record<string, unknown>): string | null {
  return readMetadataUrl(metadata, INBOX_AVATAR_METADATA_KEYS.participant);
}

export function readPageAvatarUrl(metadata: Record<string, unknown>): string | null {
  return readMetadataUrl(metadata, INBOX_AVATAR_METADATA_KEYS.page);
}

export function readInstagramAvatarUrl(metadata: Record<string, unknown>): string | null {
  return readMetadataUrl(metadata, INBOX_AVATAR_METADATA_KEYS.instagram);
}

export function resolveThreadPageAvatarUrl(input: {
  channelType: InboxChannelType;
  metadata: Record<string, unknown>;
  connectionPagePictureUrl?: string | null;
}): string | null {
  const platform = getInboxPlatform(input.channelType);
  const fromMetadata =
    platform === "instagram"
      ? readInstagramAvatarUrl(input.metadata) ?? readPageAvatarUrl(input.metadata)
      : readPageAvatarUrl(input.metadata);

  return fromMetadata ?? input.connectionPagePictureUrl ?? null;
}

export function buildAvatarMetadata(input: {
  participantAvatarUrl?: string | null;
  pageAvatarUrl?: string | null;
  instagramAvatarUrl?: string | null;
}): Record<string, string> {
  const metadata: Record<string, string> = {};

  if (input.participantAvatarUrl?.trim()) {
    metadata[INBOX_AVATAR_METADATA_KEYS.participant] = input.participantAvatarUrl.trim();
  }
  if (input.pageAvatarUrl?.trim()) {
    metadata[INBOX_AVATAR_METADATA_KEYS.page] = input.pageAvatarUrl.trim();
  }
  if (input.instagramAvatarUrl?.trim()) {
    metadata[INBOX_AVATAR_METADATA_KEYS.instagram] = input.instagramAvatarUrl.trim();
  }

  return metadata;
}

/**
 * Shallow-merge thread metadata, but never blank an existing avatar URL
 * when the incoming patch omits it or sends an empty string/null.
 */
export function mergeInboxThreadMetadata(
  existing: Record<string, unknown> | null | undefined,
  incoming: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const merged: Record<string, unknown> = {
    ...(existing ?? {}),
    ...(incoming ?? {}),
  };

  for (const key of Object.values(INBOX_AVATAR_METADATA_KEYS)) {
    const incomingVal = incoming?.[key];
    const existingVal = existing?.[key];
    const incomingBlank =
      incomingVal == null ||
      (typeof incomingVal === "string" && !incomingVal.trim());
    const existingUrl =
      typeof existingVal === "string" && existingVal.trim()
        ? existingVal.trim()
        : null;

    if (incomingBlank && existingUrl) {
      merged[key] = existingUrl;
    }
  }

  return merged;
}

/** Two-letter initials for queue/header/bubble fallbacks (e.g. "RH"). */
export function inboxParticipantInitials(
  name: string | null | undefined,
): string {
  if (!name?.trim()) {
    return "?";
  }

  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }

  return name.slice(0, 2).toUpperCase();
}
