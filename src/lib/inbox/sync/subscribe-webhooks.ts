import "server-only";

import { inboxGraphGet, inboxGraphPost } from "@/lib/inbox/sync/graph-client";
import {
  getMetaAppAccessToken,
  getMetaAppId,
} from "@/lib/meta-publishing/config.server";

const PAGE_SUBSCRIBED_FIELDS = [
  "messages",
  "messaging_postbacks",
  "message_deliveries",
  "message_reads",
  "standby",
  "feed",
] as const;

const INSTAGRAM_SUBSCRIBED_FIELDS = ["comments", "messages"] as const;

const PAGE_SUBSCRIBED_FIELDS_CSV = PAGE_SUBSCRIBED_FIELDS.join(",");
const INSTAGRAM_SUBSCRIBED_FIELDS_CSV = INSTAGRAM_SUBSCRIBED_FIELDS.join(",");

function getWebhookCallbackUrl(): string | null {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "";
  if (!site) {
    return null;
  }
  try {
    return new URL("/api/meta/webhook", site).toString();
  } catch {
    return null;
  }
}

function getWebhookVerifyToken(): string | null {
  return process.env.META_WEBHOOK_VERIFY_TOKEN?.trim() || null;
}

function subscriptionFieldNames(
  subscription: Record<string, unknown> | null | undefined,
): string[] {
  const fields = subscription?.fields;
  if (!Array.isArray(fields)) {
    return [];
  }
  return fields
    .map((entry) => {
      if (typeof entry === "string") {
        return entry;
      }
      if (entry && typeof entry === "object" && "name" in entry) {
        const name = (entry as { name?: unknown }).name;
        return typeof name === "string" ? name : null;
      }
      return null;
    })
    .filter((name): name is string => Boolean(name));
}

/**
 * App-level Webhooks product subscriptions (/{app-id}/subscriptions).
 * Page `subscribed_apps` alone is not enough — Meta only delivers fields
 * subscribed at BOTH app and Page levels.
 */
export async function ensureMetaAppWebhookSubscriptions(): Promise<{
  ok: boolean;
  error: string | null;
  pageFields: string[];
  instagramFields: string[];
}> {
  const callbackUrl = getWebhookCallbackUrl();
  const verifyToken = getWebhookVerifyToken();

  if (!callbackUrl || !verifyToken) {
    return {
      ok: false,
      error:
        "META_WEBHOOK_VERIFY_TOKEN and NEXT_PUBLIC_SITE_URL (or NEXT_PUBLIC_APP_URL) are required to configure app webhook field subscriptions.",
      pageFields: [],
      instagramFields: [],
    };
  }

  let appId: string;
  let appAccessToken: string;
  try {
    appId = getMetaAppId();
    appAccessToken = getMetaAppAccessToken();
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Meta app credentials missing.",
      pageFields: [],
      instagramFields: [],
    };
  }

  const pageResult = await inboxGraphPost<Record<string, unknown>>(
    `/${appId}/subscriptions`,
    {
      object: "page",
      callback_url: callbackUrl,
      verify_token: verifyToken,
      fields: PAGE_SUBSCRIBED_FIELDS_CSV,
      include_values: "true",
      access_token: appAccessToken,
    },
  );

  if (!pageResult.ok) {
    return {
      ok: false,
      error: `App page webhook fields: ${pageResult.error}`,
      pageFields: [],
      instagramFields: [],
    };
  }

  const igResult = await inboxGraphPost<Record<string, unknown>>(
    `/${appId}/subscriptions`,
    {
      object: "instagram",
      callback_url: callbackUrl,
      verify_token: verifyToken,
      fields: INSTAGRAM_SUBSCRIBED_FIELDS_CSV,
      include_values: "true",
      access_token: appAccessToken,
    },
  );

  if (!igResult.ok) {
    return {
      ok: false,
      error: `App Instagram webhook fields: ${igResult.error}`,
      pageFields: [...PAGE_SUBSCRIBED_FIELDS],
      instagramFields: [],
    };
  }

  const listed = await inboxGraphGet<{ data?: Record<string, unknown>[] }>(
    `/${appId}/subscriptions`,
    { access_token: appAccessToken },
  );

  let pageFields: string[] = [...PAGE_SUBSCRIBED_FIELDS];
  let instagramFields: string[] = [...INSTAGRAM_SUBSCRIBED_FIELDS];

  if (listed.ok && Array.isArray(listed.data.data)) {
    for (const row of listed.data.data) {
      const object = typeof row.object === "string" ? row.object : "";
      const names = subscriptionFieldNames(row);
      if (object === "page") {
        pageFields = names;
      }
      if (object === "instagram") {
        instagramFields = names;
      }
    }
  }

  const missingPage = PAGE_SUBSCRIBED_FIELDS.filter((f) => !pageFields.includes(f));
  if (missingPage.length > 0) {
    return {
      ok: false,
      error: `App page webhook missing fields: ${missingPage.join(", ")}`,
      pageFields,
      instagramFields,
    };
  }

  return { ok: true, error: null, pageFields, instagramFields };
}

export async function subscribeMetaInboxWebhooks(input: {
  pageId: string;
  instagramAccountId?: string | null;
  pageAccessToken: string;
}): Promise<{ ok: boolean; error: string | null }> {
  const appSubscriptions = await ensureMetaAppWebhookSubscriptions();
  if (!appSubscriptions.ok) {
    console.error(
      "[inbox webhook] app-level field subscription incomplete:",
      appSubscriptions.error,
    );
  }

  const pageResult = await inboxGraphPost<Record<string, unknown>>(
    `/${input.pageId}/subscribed_apps`,
    {
      subscribed_fields: PAGE_SUBSCRIBED_FIELDS_CSV,
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
        subscribed_fields: INSTAGRAM_SUBSCRIBED_FIELDS_CSV,
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

  if (!appSubscriptions.ok) {
    return {
      ok: false,
      error: `Page subscribed; app webhook fields incomplete: ${appSubscriptions.error}`,
    };
  }

  return { ok: true, error: null };
}
