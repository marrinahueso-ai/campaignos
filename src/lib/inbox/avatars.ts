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
