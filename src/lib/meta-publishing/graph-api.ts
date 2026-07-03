import {
  getMetaAppAccessToken,
  getMetaAppId,
  getMetaAppSecret,
} from "@/lib/meta-publishing/config.server";

const DEFAULT_GRAPH_VERSION = "v21.0";

function graphVersion(): string {
  return process.env.META_GRAPH_API_VERSION?.trim() || DEFAULT_GRAPH_VERSION;
}

function graphUrl(path: string): string {
  return `https://graph.facebook.com/${graphVersion()}${path}`;
}

type GraphResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string };

async function graphPost(
  path: string,
  params: Record<string, string>,
): Promise<GraphResult> {
  const body = new URLSearchParams(params);

  const response = await fetch(graphUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const payload = (await response.json()) as {
    id?: string;
    post_id?: string;
    error?: { message?: string };
  };

  if (!response.ok || payload.error) {
    return {
      ok: false,
      error: payload.error?.message ?? `Meta API error (${response.status})`,
    };
  }

  return { ok: true, data: payload as Record<string, unknown> };
}

async function graphGet(path: string, params: Record<string, string>): Promise<GraphResult> {
  const url = new URL(graphUrl(path));
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString());
  const payload = (await response.json()) as {
    status_code?: string;
    error?: { message?: string };
  };

  if (!response.ok || payload.error) {
    return {
      ok: false,
      error: payload.error?.message ?? `Meta API error (${response.status})`,
    };
  }

  return { ok: true, data: payload as Record<string, unknown> };
}

async function waitForInstagramContainer(input: {
  containerId: string;
  accessToken: string;
}): Promise<GraphResult> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const status = await graphGet(`/${input.containerId}`, {
      fields: "status_code",
      access_token: input.accessToken,
    });

    if (!status.ok) {
      return status;
    }

    const code = status.data.status_code as string | undefined;
    if (code === "FINISHED") {
      return status;
    }
    if (code === "ERROR") {
      return { ok: false, error: "Instagram media container failed processing." };
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  return { ok: false, error: "Instagram media container timed out." };
}

export async function publishFacebookFeedPhoto(input: {
  pageId: string;
  accessToken: string;
  imageUrl: string;
  caption: string;
}): Promise<{ postId: string | null; error: string | null }> {
  const result = await graphPost(`/${input.pageId}/photos`, {
    url: input.imageUrl,
    caption: input.caption,
    access_token: input.accessToken,
  });

  if (!result.ok) {
    return { postId: null, error: result.error };
  }

  const postId = String(result.data.id ?? result.data.post_id ?? "");
  return { postId: postId || null, error: null };
}

export async function publishFacebookPhotoStory(input: {
  pageId: string;
  accessToken: string;
  imageUrl: string;
}): Promise<{ postId: string | null; error: string | null }> {
  const upload = await graphPost(`/${input.pageId}/photos`, {
    url: input.imageUrl,
    published: "false",
    access_token: input.accessToken,
  });

  if (!upload.ok) {
    return { postId: null, error: upload.error };
  }

  const photoId = String(upload.data.id ?? "");
  if (!photoId) {
    return { postId: null, error: "Facebook story upload did not return a photo id." };
  }

  const story = await graphPost(`/${input.pageId}/photo_stories`, {
    photo_id: photoId,
    access_token: input.accessToken,
  });

  if (!story.ok) {
    return { postId: null, error: story.error };
  }

  return { postId: String(story.data.id ?? photoId), error: null };
}

export async function publishInstagramImage(input: {
  instagramAccountId: string;
  accessToken: string;
  imageUrl: string;
  caption?: string;
  mediaType?: "FEED" | "STORIES";
}): Promise<{ postId: string | null; error: string | null }> {
  const isStory = input.mediaType === "STORIES";
  const createParams: Record<string, string> = {
    image_url: input.imageUrl,
    access_token: input.accessToken,
  };

  if (isStory) {
    createParams.media_type = "STORIES";
  } else if (input.caption) {
    createParams.caption = input.caption;
  }

  const created = await graphPost(`/${input.instagramAccountId}/media`, createParams);
  if (!created.ok) {
    return { postId: null, error: created.error };
  }

  const containerId = String(created.data.id ?? "");
  if (!containerId) {
    return { postId: null, error: "Instagram media container was not created." };
  }

  const ready = await waitForInstagramContainer({
    containerId,
    accessToken: input.accessToken,
  });
  if (!ready.ok) {
    return { postId: null, error: ready.error };
  }

  const published = await graphPost(`/${input.instagramAccountId}/media_publish`, {
    creation_id: containerId,
    access_token: input.accessToken,
  });

  if (!published.ok) {
    return { postId: null, error: published.error };
  }

  return { postId: String(published.data.id ?? containerId), error: null };
}

export interface ResolvedMetaPage {
  id: string;
  name: string;
  accessToken: string;
  instagramAccountId: string | null;
}

export async function fetchPagesFromUserToken(
  userAccessToken: string,
): Promise<{ pages: ResolvedMetaPage[]; error: string | null }> {
  const result = await graphGet("/me/accounts", {
    fields: "id,name,access_token",
    access_token: userAccessToken.trim(),
  });

  if (!result.ok) {
    return { pages: [], error: result.error };
  }

  const rawPages = result.data.data as
    | Array<{ id?: string; name?: string; access_token?: string }>
    | undefined;

  if (!rawPages?.length) {
    return {
      pages: [],
      error:
        "No Facebook Pages found for this token. In Graph API Explorer, regenerate the token and grant access to your Page.",
    };
  }

  const pages: ResolvedMetaPage[] = [];

  for (const page of rawPages) {
    const pageId = String(page.id ?? "");
    const pageToken = String(page.access_token ?? "");
    if (!pageId || !pageToken) {
      continue;
    }

    const details = await graphGet(`/${pageId}`, {
      fields: "name,instagram_business_account",
      access_token: pageToken,
    });

    const linkedIg = details.ok
      ? ((details.data.instagram_business_account as { id?: string } | undefined)?.id ?? null)
      : null;

    pages.push({
      id: pageId,
      name: details.ok
        ? String(details.data.name ?? page.name ?? "Facebook Page")
        : String(page.name ?? "Facebook Page"),
      accessToken: pageToken,
      instagramAccountId: linkedIg,
    });
  }

  if (pages.length === 0) {
    return { pages: [], error: "Could not resolve a Page access token from Meta." };
  }

  return { pages, error: null };
}

type TokenExchangeResult = {
  accessToken: string | null;
  expiresIn: number | null;
  error: string | null;
};

async function exchangeOAuthToken(
  params: Record<string, string>,
): Promise<TokenExchangeResult> {
  const url = new URL(graphUrl("/oauth/access_token"));
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString());
  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { message?: string };
  };

  if (!response.ok || payload.error || !payload.access_token) {
    return {
      accessToken: null,
      expiresIn: null,
      error: payload.error?.message ?? `Meta token exchange failed (${response.status})`,
    };
  }

  return {
    accessToken: payload.access_token,
    expiresIn: typeof payload.expires_in === "number" ? payload.expires_in : null,
    error: null,
  };
}

export async function exchangeCodeForUserToken(input: {
  code: string;
  redirectUri: string;
}): Promise<TokenExchangeResult> {
  return exchangeOAuthToken({
    client_id: getMetaAppId(),
    client_secret: getMetaAppSecret(),
    redirect_uri: input.redirectUri,
    code: input.code,
  });
}

export async function exchangeShortLivedForLongLived(input: {
  shortLivedToken: string;
}): Promise<TokenExchangeResult> {
  return exchangeOAuthToken({
    grant_type: "fb_exchange_token",
    client_id: getMetaAppId(),
    client_secret: getMetaAppSecret(),
    fb_exchange_token: input.shortLivedToken,
  });
}

export async function debugToken(input: {
  inputToken: string;
}): Promise<{
  ok: boolean;
  isValid: boolean;
  expiresAt: string | null;
  scopes: string[];
  error: string | null;
}> {
  const result = await graphGet("/debug_token", {
    input_token: input.inputToken,
    access_token: getMetaAppAccessToken(),
  });

  if (!result.ok) {
    return {
      ok: false,
      isValid: false,
      expiresAt: null,
      scopes: [],
      error: result.error,
    };
  }

  const data = result.data.data as
    | {
        is_valid?: boolean;
        expires_at?: number;
        scopes?: string[];
      }
    | undefined;

  const expiresAt =
    typeof data?.expires_at === "number" && data.expires_at > 0
      ? new Date(data.expires_at * 1000).toISOString()
      : null;

  return {
    ok: true,
    isValid: Boolean(data?.is_valid),
    expiresAt,
    scopes: Array.isArray(data?.scopes) ? data.scopes : [],
    error: null,
  };
}

export async function verifyMetaConnection(input: {
  pageId: string;
  instagramAccountId?: string;
  accessToken: string;
}): Promise<{ ok: boolean; pageName: string | null; error: string | null }> {
  const result = await graphGet(`/${input.pageId}`, {
    fields: "name,instagram_business_account",
    access_token: input.accessToken,
  });

  if (!result.ok) {
    return { ok: false, pageName: null, error: result.error };
  }

  const linkedIg = (
    result.data.instagram_business_account as { id?: string } | undefined
  )?.id;

  const igId = input.instagramAccountId?.trim() ?? "";

  if (linkedIg && igId && linkedIg !== igId) {
    return {
      ok: false,
      pageName: String(result.data.name ?? ""),
      error: `Instagram account mismatch. Page is linked to ${linkedIg}.`,
    };
  }

  return {
    ok: true,
    pageName: String(result.data.name ?? ""),
    error: null,
  };
}
