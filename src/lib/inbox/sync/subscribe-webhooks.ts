import "server-only";

import { inboxGraphPost } from "@/lib/inbox/sync/graph-client";

const PAGE_SUBSCRIBED_FIELDS = [
  "messages",
  "messaging_postbacks",
  "message_deliveries",
  "message_reads",
  "feed",
].join(",");

const INSTAGRAM_SUBSCRIBED_FIELDS = ["comments", "messages"].join(",");

export async function subscribeMetaInboxWebhooks(input: {
  pageId: string;
  instagramAccountId?: string | null;
  pageAccessToken: string;
}): Promise<{ ok: boolean; error: string | null }> {
  const pageResult = await inboxGraphPost<Record<string, unknown>>(
    `/${input.pageId}/subscribed_apps`,
    {
      subscribed_fields: PAGE_SUBSCRIBED_FIELDS,
      access_token: input.pageAccessToken,
    },
  );

  if (!pageResult.ok) {
    return { ok: false, error: pageResult.error };
  }

  if (input.instagramAccountId?.trim()) {
    const igResult = await inboxGraphPost<Record<string, unknown>>(
      `/${input.instagramAccountId}/subscribed_apps`,
      {
        subscribed_fields: INSTAGRAM_SUBSCRIBED_FIELDS,
        access_token: input.pageAccessToken,
      },
    );

    if (!igResult.ok) {
      return {
        ok: false,
        error: `Page subscribed; Instagram failed: ${igResult.error}`,
      };
    }
  }

  return { ok: true, error: null };
}
