import "server-only";

import { buildAvatarMetadata } from "@/lib/inbox/avatars";
import type { NormalizedInboxThread } from "@/lib/inbox/sync/types";
import { asRecord, inboxGraphGet, readString } from "@/lib/inbox/sync/graph-client";

export type MessagingParticipantProfile = {
  name: string | null;
  avatarUrl: string | null;
};

class InboxProfilePictureCache {
  private readonly cache = new Map<string, string | null>();
  private readonly profileCache = new Map<string, MessagingParticipantProfile>();

  constructor(private readonly pageAccessToken: string) {}

  async resolveFacebookPicture(userId: string): Promise<string | null> {
    const key = `fb:${userId}`;
    if (this.cache.has(key)) {
      return this.cache.get(key) ?? null;
    }

    const result = await inboxGraphGet<Record<string, unknown>>(`/${userId}`, {
      fields: "picture.type(large)",
      access_token: this.pageAccessToken,
    });

    let url: string | null = null;
    if (result.ok) {
      const picture = asRecord(result.data.picture);
      const data = asRecord(picture?.data);
      url = readString(data?.url);
    }

    this.cache.set(key, url);
    return url;
  }

  async resolveInstagramPicture(userId: string): Promise<string | null> {
    const key = `ig:${userId}`;
    if (this.cache.has(key)) {
      return this.cache.get(key) ?? null;
    }

    const result = await inboxGraphGet<Record<string, unknown>>(`/${userId}`, {
      fields: "profile_picture_url",
      access_token: this.pageAccessToken,
    });

    const url = result.ok ? readString(result.data.profile_picture_url) : null;
    this.cache.set(key, url);
    return url;
  }

  /**
   * Page-token User Profile / PSID lookup for Messenger (and IG when available).
   * Returns whatever Meta allows (often first name only without advanced profile access).
   */
  async resolveMessagingParticipantProfile(
    userId: string,
    options?: { preferInstagram?: boolean },
  ): Promise<MessagingParticipantProfile> {
    const key = `${options?.preferInstagram ? "ig" : "fb"}:profile:${userId}`;
    if (this.profileCache.has(key)) {
      return this.profileCache.get(key) ?? { name: null, avatarUrl: null };
    }

    if (options?.preferInstagram) {
      const igResult = await inboxGraphGet<Record<string, unknown>>(`/${userId}`, {
        fields: "name,username,profile_picture_url",
        access_token: this.pageAccessToken,
      });

      if (igResult.ok) {
        const name =
          readString(igResult.data.name) ??
          readString(igResult.data.username);
        const avatarUrl = readString(igResult.data.profile_picture_url);
        const profile = { name, avatarUrl };
        this.profileCache.set(key, profile);
        if (avatarUrl) {
          this.cache.set(`ig:${userId}`, avatarUrl);
        }
        return profile;
      }
    }

    const result = await inboxGraphGet<Record<string, unknown>>(`/${userId}`, {
      fields: "name,first_name,last_name,profile_pic,picture.type(large)",
      access_token: this.pageAccessToken,
    });

    let name: string | null = null;
    let avatarUrl: string | null = null;

    if (result.ok) {
      const first = readString(result.data.first_name);
      const last = readString(result.data.last_name);
      const combined = [first, last].filter(Boolean).join(" ").trim();
      name = readString(result.data.name) ?? (combined || null) ?? first;

      avatarUrl = readString(result.data.profile_pic);
      if (!avatarUrl) {
        const picture = asRecord(result.data.picture);
        const data = asRecord(picture?.data);
        avatarUrl = readString(data?.url);
      }
    }

    const profile = { name, avatarUrl };
    this.profileCache.set(key, profile);
    if (avatarUrl) {
      this.cache.set(`fb:${userId}`, avatarUrl);
    }
    return profile;
  }
}

export async function fetchMessagingParticipantProfile(input: {
  participantId: string;
  pageAccessToken: string;
  preferInstagram?: boolean;
}): Promise<MessagingParticipantProfile> {
  const cache = new InboxProfilePictureCache(input.pageAccessToken);
  return cache.resolveMessagingParticipantProfile(input.participantId, {
    preferInstagram: input.preferInstagram,
  });
}

export async function fetchConnectedPageProfilePictures(input: {
  pageId: string;
  instagramAccountId: string;
  pageAccessToken: string;
}): Promise<{ pageAvatarUrl: string | null; instagramAvatarUrl: string | null }> {
  const cache = new InboxProfilePictureCache(input.pageAccessToken);

  const [pageAvatarUrl, instagramAvatarUrl] = await Promise.all([
    cache.resolveFacebookPicture(input.pageId),
    input.instagramAccountId.trim()
      ? cache.resolveInstagramPicture(input.instagramAccountId.trim())
      : Promise.resolve(null),
  ]);

  return { pageAvatarUrl, instagramAvatarUrl };
}

export async function enrichInboxThreadsWithAvatars(input: {
  threads: NormalizedInboxThread[];
  pageAvatarUrl: string | null;
  instagramAvatarUrl: string | null;
  pageAccessToken: string;
}): Promise<void> {
  const cache = new InboxProfilePictureCache(input.pageAccessToken);
  const avatarByParticipantId = new Map<string, string>();

  for (const thread of input.threads) {
    const metadata: Record<string, unknown> = {
      ...(thread.metadata ?? {}),
      ...buildAvatarMetadata({
        pageAvatarUrl: input.pageAvatarUrl,
        instagramAvatarUrl: input.instagramAvatarUrl,
      }),
    };

    const existingParticipantAvatar =
      typeof metadata.participant_avatar_url === "string" &&
      metadata.participant_avatar_url.trim()
        ? metadata.participant_avatar_url.trim()
        : null;

    const participantId = thread.participantExternalId?.trim();
    if (participantId && existingParticipantAvatar) {
      avatarByParticipantId.set(participantId, existingParticipantAvatar);
    }

    if (participantId && !existingParticipantAvatar) {
      const isInstagramChannel = thread.channelType.startsWith("instagram");
      let participantAvatarUrl: string | null = null;

      if (isInstagramChannel) {
        participantAvatarUrl = await cache.resolveInstagramPicture(participantId);
        if (!participantAvatarUrl) {
          const profile = await cache.resolveMessagingParticipantProfile(participantId, {
            preferInstagram: false,
          });
          participantAvatarUrl = profile.avatarUrl;
        }
      } else {
        const profile = await cache.resolveMessagingParticipantProfile(participantId, {
          preferInstagram: false,
        });
        participantAvatarUrl = profile.avatarUrl;
        if (!participantAvatarUrl) {
          participantAvatarUrl = await cache.resolveFacebookPicture(participantId);
        }
      }

      if (participantAvatarUrl) {
        metadata.participant_avatar_url = participantAvatarUrl;
        avatarByParticipantId.set(participantId, participantAvatarUrl);
      }
    }

    thread.metadata = metadata;
  }

  // Same contact can appear on DM + comment threads; share a resolved picture
  // when Graph already returned one for that participant id in this batch.
  for (const thread of input.threads) {
    const participantId = thread.participantExternalId?.trim();
    if (!participantId) {
      continue;
    }
    const existing =
      typeof thread.metadata?.participant_avatar_url === "string" &&
      thread.metadata.participant_avatar_url.trim()
        ? thread.metadata.participant_avatar_url.trim()
        : null;
    if (existing) {
      continue;
    }
    const shared = avatarByParticipantId.get(participantId);
    if (shared) {
      thread.metadata = {
        ...(thread.metadata ?? {}),
        participant_avatar_url: shared,
      };
    }
  }
}
