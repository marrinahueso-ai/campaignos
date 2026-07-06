import "server-only";

import { buildAvatarMetadata } from "@/lib/inbox/avatars";
import type { NormalizedInboxThread } from "@/lib/inbox/sync/types";
import { asRecord, inboxGraphGet, readString } from "@/lib/inbox/sync/graph-client";

class InboxProfilePictureCache {
  private readonly cache = new Map<string, string | null>();

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

  for (const thread of input.threads) {
    const metadata: Record<string, unknown> = {
      ...(thread.metadata ?? {}),
      ...buildAvatarMetadata({
        pageAvatarUrl: input.pageAvatarUrl,
        instagramAvatarUrl: input.instagramAvatarUrl,
      }),
    };

    const participantId = thread.participantExternalId?.trim();
    if (participantId) {
      const isInstagramChannel = thread.channelType.startsWith("instagram");
      let participantAvatarUrl = isInstagramChannel
        ? await cache.resolveInstagramPicture(participantId)
        : await cache.resolveFacebookPicture(participantId);

      if (!participantAvatarUrl && isInstagramChannel) {
        participantAvatarUrl = await cache.resolveFacebookPicture(participantId);
      }

      if (participantAvatarUrl) {
        metadata.participant_avatar_url = participantAvatarUrl;
      }
    }

    thread.metadata = metadata;
  }
}
