import {
  getMetaAppAccessToken,
  getMetaAppId,
  getMetaAppSecret,
  getMetaFacebookPageId,
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
  | { ok: false; error: string; errorCode?: number; errorType?: string };

type GraphErrorPayload = {
  message?: string;
  code?: number;
  type?: string;
  error_subcode?: number;
};

function formatGraphError(payload: GraphErrorPayload, status: number): string {
  const parts = [payload.message ?? `Meta API error (${status})`];
  if (payload.code != null) {
    parts.push(`code=${payload.code}`);
  }
  if (payload.type) {
    parts.push(`type=${payload.type}`);
  }
  if (payload.error_subcode != null) {
    parts.push(`subcode=${payload.error_subcode}`);
  }
  return parts.join(" · ");
}

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
    error?: GraphErrorPayload;
  };

  if (!response.ok || payload.error) {
    return {
      ok: false,
      error: formatGraphError(payload.error ?? {}, response.status),
      errorCode: payload.error?.code,
      errorType: payload.error?.type,
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
    data?: unknown[];
    paging?: { next?: string };
    error?: GraphErrorPayload;
  };

  if (!response.ok || payload.error) {
    return {
      ok: false,
      error: formatGraphError(payload.error ?? {}, response.status),
      errorCode: payload.error?.code,
      errorType: payload.error?.type,
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

type RawMetaPage = {
  id?: string;
  name?: string;
  access_token?: string;
};

async function graphGetPaginated(
  path: string,
  params: Record<string, string>,
): Promise<{ items: RawMetaPage[]; error: string | null }> {
  const items: RawMetaPage[] = [];
  let nextPath: string | null = path;
  let nextParams: Record<string, string> | null = params;

  while (nextPath) {
    const result = await graphGet(nextPath, nextParams ?? {});
    if (!result.ok) {
      return { items, error: result.error };
    }

    const pageItems = result.data.data as RawMetaPage[] | undefined;
    if (pageItems?.length) {
      items.push(...pageItems);
    }

    const nextUrl = (result.data.paging as { next?: string } | undefined)?.next;
    if (!nextUrl) {
      break;
    }

    const parsed = new URL(nextUrl);
    const versionPrefix = `/${graphVersion()}`;
    nextPath = parsed.pathname.startsWith(versionPrefix)
      ? parsed.pathname.slice(versionPrefix.length)
      : parsed.pathname;
    nextParams = Object.fromEntries(parsed.searchParams.entries());
  }

  return { items, error: null };
}

async function resolveMetaPageFromRaw(
  page: RawMetaPage,
  fallbackToken?: string,
): Promise<ResolvedMetaPage | null> {
  const pageId = String(page.id ?? "");
  const pageToken = String(page.access_token ?? fallbackToken ?? "");
  if (!pageId || !pageToken) {
    return null;
  }

  const details = await graphGet(`/${pageId}`, {
    fields: "name,instagram_business_account",
    access_token: pageToken,
  });

  const linkedIg = details.ok
    ? ((details.data.instagram_business_account as { id?: string } | undefined)?.id ?? null)
    : null;

  return {
    id: pageId,
    name: details.ok
      ? String(details.data.name ?? page.name ?? "Facebook Page")
      : String(page.name ?? "Facebook Page"),
    accessToken: pageToken,
    instagramAccountId: linkedIg,
  };
}

type GranularScopeEntry = {
  scope?: string;
  target_ids?: string[];
  target_id?: string;
};

function isPagePermissionScope(scope: string): boolean {
  // instagram_* target_ids are IG account IDs, not Page IDs.
  return /^pages[_/]/.test(scope) || scope === "pages" || scope === "manage_pages";
}

function isInstagramPermissionScope(scope: string): boolean {
  return /^instagram[_/]/.test(scope) || scope === "instagram_basic";
}

function instagramIdsFromGranularScopes(
  granularScopes: GranularScopeEntry[] | undefined,
): string[] {
  if (!granularScopes?.length) {
    return [];
  }

  const instagramIds = new Set<string>();
  for (const entry of granularScopes) {
    const scope = String(entry.scope ?? "");
    if (!isInstagramPermissionScope(scope)) {
      continue;
    }
    for (const id of targetIdsFromGranularEntry(entry)) {
      instagramIds.add(id);
    }
  }

  return [...instagramIds];
}

async function probePageNode(input: {
  pageId: string;
  accessToken: string;
  fieldSets: string[];
}): Promise<{
  ok: boolean;
  id: string;
  name: string | null;
  instagramAccountId: string | null;
  error: string | null;
}> {
  const results = await Promise.all(
    input.fieldSets.map((fields) =>
      graphGet(`/${input.pageId}`, {
        fields,
        access_token: input.accessToken,
      }),
    ),
  );

  for (let index = 0; index < results.length; index += 1) {
    const result = results[index];
    const fields = input.fieldSets[index];

    if (!result.ok) {
      console.warn(`Meta GET /${input.pageId} fields=${fields} failed:`, result.error);
      continue;
    }

    const linkedIg =
      (result.data.instagram_business_account as { id?: string } | undefined)?.id ?? null;

    return {
      ok: true,
      id: String(result.data.id ?? input.pageId),
      name: result.data.name != null ? String(result.data.name) : null,
      instagramAccountId: linkedIg,
      error: null,
    };
  }

  return {
    ok: false,
    id: input.pageId,
    name: null,
    instagramAccountId: null,
    error: "Page probe failed for all field sets.",
  };
}

async function probeMeAsPage(input: {
  accessToken: string;
  expectedPageId?: string | null;
}): Promise<ResolvedMetaPage | null> {
  const fieldSets = ["id,name,instagram_business_account", "id,name", "id"];
  const results = await Promise.all(
    fieldSets.map((fields) =>
      graphGet("/me", {
        fields,
        access_token: input.accessToken,
      }),
    ),
  );

  for (const result of results) {
    if (!result.ok) {
      continue;
    }

    const pageId = normalizeTargetId(result.data.id);
    if (!pageId) {
      continue;
    }

    if (input.expectedPageId && pageId !== input.expectedPageId) {
      continue;
    }

    const linkedIg =
      (result.data.instagram_business_account as { id?: string } | undefined)?.id ?? null;

    return {
      id: pageId,
      name: String(result.data.name ?? "Facebook Page"),
      accessToken: input.accessToken,
      instagramAccountId: linkedIg,
    };
  }

  return null;
}

function normalizeTargetId(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  const id = String(value).trim();
  return /^\d+$/.test(id) ? id : null;
}

function targetIdsFromGranularEntry(entry: GranularScopeEntry): string[] {
  const ids: string[] = [];
  for (const targetId of entry.target_ids ?? []) {
    const id = normalizeTargetId(targetId);
    if (id) {
      ids.push(id);
    }
  }

  const singular = normalizeTargetId(entry.target_id);
  if (singular) {
    ids.push(singular);
  }

  return ids;
}

function pageIdsFromGranularScopes(
  granularScopes: GranularScopeEntry[] | undefined,
): string[] {
  if (!granularScopes?.length) {
    return [];
  }

  const pageIds = new Set<string>();
  for (const entry of granularScopes) {
    const scope = String(entry.scope ?? "");
    if (!isPagePermissionScope(scope)) {
      continue;
    }
    for (const id of targetIdsFromGranularEntry(entry)) {
      pageIds.add(id);
    }
  }

  return [...pageIds];
}

/** All numeric asset IDs from granular scopes (Login for Business may use non-pages_* scope names). */
function allTargetIdsFromGranularScopes(
  granularScopes: GranularScopeEntry[] | undefined,
): string[] {
  if (!granularScopes?.length) {
    return [];
  }

  const ids = new Set<string>();
  for (const entry of granularScopes) {
    for (const id of targetIdsFromGranularEntry(entry)) {
      ids.add(id);
    }
  }

  return [...ids];
}

function collectTrustedPageIds(input: {
  granularPageIds: string[];
  profileId: string | null;
  fallbackPageIds?: string[];
}): string[] {
  return uniquePageIds([
    ...input.granularPageIds,
    input.profileId,
    ...(input.fallbackPageIds ?? []),
    getMetaFacebookPageId(),
  ]);
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    const trimmed = String(value ?? "").trim();
    if (trimmed) {
      seen.add(trimmed);
    }
  }
  return [...seen];
}

function userAccessTokensFromOptions(
  primaryToken: string,
  options?: { alternateTokens?: string[]; preferAlternateFirst?: boolean },
): string[] {
  const alternates = (options?.alternateTokens ?? [])
    .map((token) => token.trim())
    .filter(Boolean);
  const primary = primaryToken.trim();

  if (options?.preferAlternateFirst && alternates.length > 0) {
    return uniqueStrings([...alternates, primary]);
  }

  return uniqueStrings([primary, ...alternates]);
}

async function fetchPageFromUserTokenById(input: {
  pageId: string;
  userAccessTokens: string[];
  trustedPageIds?: string[];
  instagramAccountIdHint?: string | null;
}): Promise<ResolvedMetaPage | null> {
  const trustedIds = new Set(input.trustedPageIds ?? []);
  const instagramHint = input.instagramAccountIdHint?.trim() || null;
  const fieldSets = [
    "id,name,access_token,instagram_business_account",
    "access_token,name,instagram_business_account",
    "access_token,name",
    "access_token",
  ];
  const directFieldSets = [
    "id,name,instagram_business_account",
    "id,name",
    "id",
    "name",
  ];

  for (const userAccessToken of input.userAccessTokens) {
    const token = userAccessToken.trim();
    if (!token) {
      continue;
    }

    const fieldResults = await Promise.all(
      fieldSets.map((fields) =>
        graphGet(`/${input.pageId}`, {
          fields,
          access_token: token,
        }),
      ),
    );

    for (let index = 0; index < fieldResults.length; index += 1) {
      const result = fieldResults[index];
      const fields = fieldSets[index];

      if (!result.ok) {
        console.warn(`Meta GET /${input.pageId} fields=${fields} failed:`, result.error);
        continue;
      }

      const pageToken = String(result.data.access_token ?? "");
      if (pageToken) {
        const linkedIg =
          (result.data.instagram_business_account as { id?: string } | undefined)?.id ??
          instagramHint;

        return {
          id: String(result.data.id ?? input.pageId),
          name: String(result.data.name ?? "Facebook Page"),
          accessToken: pageToken,
          instagramAccountId: linkedIg,
        };
      }

      console.warn(`Meta GET /${input.pageId} fields=${fields} returned no access_token.`);
    }

    // Login for Business may return a Page token directly (no nested access_token field).
    const directPage = await probePageNode({
      pageId: input.pageId,
      accessToken: token,
      fieldSets: directFieldSets,
    });
    if (directPage.ok) {
      return {
        id: directPage.id,
        name: directPage.name ?? "Facebook Page",
        accessToken: token,
        instagramAccountId: directPage.instagramAccountId ?? instagramHint,
      };
    }

    const meAsPage = await probeMeAsPage({
      accessToken: token,
      expectedPageId: input.pageId,
    });
    if (meAsPage) {
      return {
        ...meAsPage,
        instagramAccountId: meAsPage.instagramAccountId ?? instagramHint,
      };
    }

    // Business Suite granular scopes grant page access without a separate Page token.
    if (trustedIds.has(input.pageId)) {
      console.info(
        `Meta using granular-trust fallback for page ${input.pageId} (token …${token.slice(-6)})`,
      );
      return {
        id: input.pageId,
        name: "Facebook Page",
        accessToken: token,
        instagramAccountId: instagramHint,
      };
    }
  }

  return null;
}

async function resolvePageScopedAccessToken(
  accessToken: string,
  instagramAccountIdHint?: string | null,
): Promise<ResolvedMetaPage | null> {
  const meAsPage = await probeMeAsPage({ accessToken });
  if (!meAsPage) {
    console.warn("Meta GET /me with scoped token failed for all field sets.");
    return null;
  }

  return {
    ...meAsPage,
    instagramAccountId: meAsPage.instagramAccountId ?? instagramAccountIdHint ?? null,
  };
}

async function resolveImpersonatedPageToken(input: {
  accessToken: string;
  profileId: string | null;
  tokenType: string | null;
  instagramAccountIdHint?: string | null;
}): Promise<ResolvedMetaPage | null> {
  const tokenType = input.tokenType?.toUpperCase() ?? "";
  const pageId = normalizeTargetId(input.profileId);
  const instagramHint = input.instagramAccountIdHint?.trim() || null;

  if (pageId) {
    const details = await probePageNode({
      pageId,
      accessToken: input.accessToken,
      fieldSets: ["id,name,instagram_business_account", "id,name", "id", "name"],
    });

    if (details.ok) {
      return {
        id: details.id,
        name: details.name ?? "Facebook Page",
        accessToken: input.accessToken,
        instagramAccountId: details.instagramAccountId ?? instagramHint,
      };
    }

    console.warn(`Meta impersonated page token check failed for ${pageId}:`, details.error);

    // profile_id is the Page ID for Login for Business PAGE tokens even when field reads fail.
    if (tokenType === "PAGE") {
      return {
        id: pageId,
        name: "Facebook Page",
        accessToken: input.accessToken,
        instagramAccountId: instagramHint,
      };
    }
  }

  if (tokenType === "PAGE") {
    return resolvePageScopedAccessToken(input.accessToken, instagramHint);
  }

  return null;
}

async function fetchPageIdsFromMePermissions(userAccessToken: string): Promise<string[]> {
  const result = await graphGet("/me/permissions", {
    access_token: userAccessToken,
  });

  if (!result.ok) {
    console.warn("Meta GET /me/permissions failed:", result.error);
    return [];
  }

  const entries = result.data.data as
    | Array<{ permission?: string; status?: string; target_ids?: unknown[] }>
    | undefined;

  const pageIds = new Set<string>();
  for (const entry of entries ?? []) {
    if (entry.status !== "granted") {
      continue;
    }
    const permission = String(entry.permission ?? "");
    if (!isPagePermissionScope(permission)) {
      continue;
    }
    for (const targetId of entry.target_ids ?? []) {
      const id = normalizeTargetId(targetId);
      if (id) {
        pageIds.add(id);
      }
    }
  }

  return [...pageIds];
}

function uniquePageIds(ids: Array<string | null | undefined>): string[] {
  return uniqueStrings(ids);
}

function mergeResolvedPages(
  primary: ResolvedMetaPage[],
  secondary: ResolvedMetaPage[],
): ResolvedMetaPage[] {
  const byId = new Map<string, ResolvedMetaPage>();
  for (const page of secondary) {
    byId.set(page.id, page);
  }
  for (const page of primary) {
    byId.set(page.id, page);
  }
  return [...byId.values()];
}

async function resolveRawPagesToMetaPages(input: {
  rawPages: RawMetaPage[];
  userAccessTokens: string[];
}): Promise<ResolvedMetaPage[]> {
  const pages: ResolvedMetaPage[] = [];
  const seenIds = new Set<string>();

  for (const page of input.rawPages) {
    const pageId = String(page.id ?? "").trim();
    if (!pageId || seenIds.has(pageId)) {
      continue;
    }

    let resolved: ResolvedMetaPage | null = null;
    if (page.access_token) {
      resolved = await resolveMetaPageFromRaw(page);
    }
    if (!resolved) {
      resolved = await fetchPageFromUserTokenById({
        pageId,
        userAccessTokens: input.userAccessTokens,
      });
    }

    if (resolved) {
      seenIds.add(resolved.id);
      pages.push(resolved);
    }
  }

  return pages;
}

async function fetchPagesFromMeAccountsField(
  userAccessToken: string,
): Promise<{ items: RawMetaPage[]; error: string | null }> {
  const result = await graphGet("/me", {
    fields: "accounts{id,name,access_token}",
    access_token: userAccessToken,
  });

  if (!result.ok) {
    return { items: [], error: result.error };
  }

  const accounts = result.data.accounts as { data?: RawMetaPage[] } | undefined;
  return { items: accounts?.data ?? [], error: null };
}

async function fetchPagesFromBusinessesNested(
  userAccessToken: string,
): Promise<{ items: RawMetaPage[]; error: string | null }> {
  const result = await graphGetPaginated("/me/businesses", {
    fields: "owned_pages{id,name,access_token},client_pages{id,name,access_token}",
    access_token: userAccessToken,
  });

  if (result.error && result.items.length === 0) {
    return { items: [], error: result.error };
  }

  const items: RawMetaPage[] = [];
  const seenIds = new Set<string>();

  for (const business of result.items) {
    const businessRecord = business as Record<string, unknown>;
    for (const edge of ["owned_pages", "client_pages"] as const) {
      const nested = businessRecord[edge] as { data?: RawMetaPage[] } | undefined;
      for (const page of nested?.data ?? []) {
        const pageId = String(page.id ?? "").trim();
        if (pageId && !seenIds.has(pageId)) {
          seenIds.add(pageId);
          items.push(page);
        }
      }
    }
  }

  return { items, error: null };
}

async function fetchAllRawPageSources(userAccessToken: string): Promise<{
  rawPages: RawMetaPage[];
  sourceLabels: string[];
}> {
  const [accounts, assigned, meAccounts, businessPages, businessNested] = await Promise.all([
    graphGetPaginated("/me/accounts", {
      fields: "id,name,access_token",
      access_token: userAccessToken,
    }),
    graphGetPaginated("/me/assigned_pages", {
      fields: "id,name,access_token,tasks,permitted_tasks",
      access_token: userAccessToken,
    }),
    fetchPagesFromMeAccountsField(userAccessToken),
    fetchPagesFromBusinesses(userAccessToken),
    fetchPagesFromBusinessesNested(userAccessToken),
  ]);

  const sourceLabels: string[] = [];
  const rawPages: RawMetaPage[] = [];
  const seenIds = new Set<string>();

  const appendSource = (label: string, items: RawMetaPage[], error: string | null) => {
    if (error && items.length === 0) {
      console.warn(`Meta ${label} failed:`, error);
      return;
    }
    if (items.length === 0) {
      return;
    }

    sourceLabels.push(`${label} (${items.length})`);
    for (const page of items) {
      const pageId = String(page.id ?? "").trim();
      if (pageId && !seenIds.has(pageId)) {
        seenIds.add(pageId);
        rawPages.push(page);
      }
    }
  };

  appendSource("/me/accounts", accounts.items, accounts.error);
  appendSource("/me/assigned_pages", assigned.items, assigned.error);
  appendSource("/me?fields=accounts", meAccounts.items, meAccounts.error);
  appendSource("/me/businesses pages", businessPages.items, businessPages.error);
  appendSource("/me/businesses nested pages", businessNested.items, businessNested.error);

  return { rawPages, sourceLabels };
}

async function fetchPagesFromBusinesses(
  userAccessToken: string,
): Promise<{ items: RawMetaPage[]; error: string | null }> {
  const businesses = await graphGetPaginated("/me/businesses", {
    fields: "id,name",
    access_token: userAccessToken,
  });

  if (businesses.error && businesses.items.length === 0) {
    return { items: [], error: businesses.error };
  }

  const items: RawMetaPage[] = [];
  const seenIds = new Set<string>();

  for (const business of businesses.items) {
    const businessId = String(business.id ?? "").trim();
    if (!businessId) {
      continue;
    }

    for (const edge of ["owned_pages", "client_pages"] as const) {
      const result = await graphGetPaginated(`/${businessId}/${edge}`, {
        fields: "id,name,access_token",
        access_token: userAccessToken,
      });

      if (result.error && result.items.length === 0) {
        console.warn(`Meta /${businessId}/${edge} failed:`, result.error);
      }

      for (const page of result.items) {
        const pageId = String(page.id ?? "").trim();
        if (pageId && !seenIds.has(pageId)) {
          seenIds.add(pageId);
          items.push(page);
        }
      }
    }
  }

  return { items, error: null };
}

async function resolvePagesByIds(input: {
  pageIds: string[];
  userAccessTokens: string[];
  sourceLabel: string;
  sources: string[];
  trustedPageIds?: string[];
  instagramAccountIdHint?: string | null;
}): Promise<ResolvedMetaPage[]> {
  const results = await Promise.all(
    input.pageIds.map((pageId) =>
      fetchPageFromUserTokenById({
        pageId,
        userAccessTokens: input.userAccessTokens,
        trustedPageIds: input.trustedPageIds,
        instagramAccountIdHint: input.instagramAccountIdHint,
      }),
    ),
  );

  const pages: ResolvedMetaPage[] = [];
  const seenIds = new Set<string>();

  for (const resolved of results) {
    if (resolved && !seenIds.has(resolved.id)) {
      seenIds.add(resolved.id);
      pages.push(resolved);
    }
  }

  if (pages.length > 0) {
    input.sources.push(`${input.sourceLabel} (${pages.length}/${input.pageIds.length})`);
  }

  return pages;
}

export function mergeResolvedMetaPages(
  primary: ResolvedMetaPage[],
  secondary: ResolvedMetaPage[],
): ResolvedMetaPage[] {
  return mergeResolvedPages(primary, secondary);
}

/**
 * When META_FACEBOOK_PAGE_ID is configured, Login for Business often grants a valid user
 * token without /me/accounts or nested Page tokens. Trust the OAuth token for that Page.
 */
async function tryResolveEnvConfiguredPage(
  userAccessTokens: string[],
): Promise<ResolvedMetaPage | null> {
  const envPageId = getMetaFacebookPageId();
  if (!envPageId) {
    return null;
  }

  for (const token of userAccessTokens) {
    const trimmed = token.trim();
    if (!trimmed) {
      continue;
    }

    const debug = await debugToken({ inputToken: trimmed });
    if (!debug.ok || !debug.isValid) {
      continue;
    }

    const trustedPageIds = collectTrustedPageIds({
      granularPageIds: debug.granularPageIds,
      profileId: debug.profileId,
    });

    const resolved = await fetchPageFromUserTokenById({
      pageId: envPageId,
      userAccessTokens: [trimmed],
      trustedPageIds,
      instagramAccountIdHint: debug.granularInstagramIds[0] ?? null,
    });
    if (resolved) {
      return resolved;
    }

    console.info(
      `Meta env-page trust: using configured page ${envPageId} with OAuth token …${trimmed.slice(-6)}`,
    );
    return {
      id: envPageId,
      name: "Facebook Page",
      accessToken: trimmed,
      instagramAccountId: debug.granularInstagramIds[0] ?? null,
    };
  }

  return null;
}

export async function fetchPagesFromUserToken(
  userAccessToken: string,
  options?: {
    fallbackPageIds?: string[];
    alternateTokens?: string[];
    preferAlternateFirst?: boolean;
  },
): Promise<{ pages: ResolvedMetaPage[]; error: string | null; debugHint?: string | null }> {
  const userAccessTokens = userAccessTokensFromOptions(userAccessToken, options);
  const sources: string[] = [];
  const resolutionErrors: string[] = [];

  const envPage = await tryResolveEnvConfiguredPage(userAccessTokens);
  if (envPage) {
    return {
      pages: [envPage],
      error: null,
      debugHint: `Resolved via env_page_trust (${envPage.id})`,
    };
  }

  let pages: ResolvedMetaPage[] = [];

  for (const token of userAccessTokens) {
    const debug = await debugToken({ inputToken: token });
    if (debug.error) {
      console.warn("Meta debug_token failed:", debug.error);
      resolutionErrors.push(`debug_token: ${debug.error}`);
    } else {
      console.info("Meta token debug:", {
        isValid: debug.isValid,
        scopes: debug.scopes,
        granularPageIds: debug.granularPageIds,
        granularInstagramIds: debug.granularInstagramIds,
        profileId: debug.profileId,
        tokenType: debug.tokenType,
        userId: debug.userId,
      });
    }

    const instagramAccountIdHint = debug.granularInstagramIds[0] ?? null;
    const trustedPageIds = collectTrustedPageIds({
      granularPageIds: debug.granularPageIds,
      profileId: debug.profileId,
      fallbackPageIds: options?.fallbackPageIds,
    });

    const impersonated = await resolveImpersonatedPageToken({
      accessToken: token,
      profileId: debug.profileId,
      tokenType: debug.tokenType,
      instagramAccountIdHint,
    });
    if (impersonated) {
      pages = mergeResolvedPages([impersonated], pages);
      sources.push("impersonated_page_token");
      break;
    }

    let tokenPages: ResolvedMetaPage[] = [];
    const granularPageIds = debug.granularPageIds;
    const permissionPageIds = await fetchPageIdsFromMePermissions(token);
    const earlyPageIds = uniquePageIds([
      ...granularPageIds,
      ...(granularPageIds.length === 0 ? debug.granularTargetIds : []),
      debug.profileId,
      ...permissionPageIds,
      ...(options?.fallbackPageIds ?? []),
      getMetaFacebookPageId(),
    ]);

    if (earlyPageIds.length > 0) {
      tokenPages = await resolvePagesByIds({
        pageIds: earlyPageIds,
        userAccessTokens: [token],
        sourceLabel: granularPageIds.length > 0 ? "granular_scopes" : "permissions_or_fallback",
        sources,
        trustedPageIds,
        instagramAccountIdHint,
      });
      if (tokenPages.length === 0 && granularPageIds.length > 0) {
        resolutionErrors.push(
          `granular page IDs ${granularPageIds.join(", ")} could not resolve tokens`,
        );
      }
    }

    if (tokenPages.length === 0) {
      const { rawPages, sourceLabels } = await fetchAllRawPageSources(token);
      sources.push(...sourceLabels.map((label) => `${label} (token …${token.slice(-6)})`));
      tokenPages = await resolveRawPagesToMetaPages({ rawPages, userAccessTokens: [token] });
    }

    pages = mergeResolvedPages(tokenPages, pages);
  }

  const fallbackPageIds = uniquePageIds([
    ...(options?.fallbackPageIds ?? []),
    getMetaFacebookPageId(),
  ]);

  const unresolvedPageIds = fallbackPageIds.filter(
    (pageId) => !pages.some((page) => page.id === pageId),
  );

  if (unresolvedPageIds.length > 0) {
    const primaryDebug = await debugToken({ inputToken: userAccessTokens[0] ?? "" });
    const resolvedById = await resolvePagesByIds({
      pageIds: unresolvedPageIds,
      userAccessTokens,
      sourceLabel: "fallback_page_id",
      sources,
      trustedPageIds: uniquePageIds([
        ...primaryDebug.granularPageIds,
        ...primaryDebug.granularTargetIds,
        primaryDebug.profileId,
        ...unresolvedPageIds,
        getMetaFacebookPageId(),
      ]),
      instagramAccountIdHint: primaryDebug.granularInstagramIds[0] ?? null,
    });
    pages = [...pages, ...resolvedById];
  }

  if (pages.length === 0) {
    const primaryDebug = await debugToken({ inputToken: userAccessTokens[0] ?? "" });
    const scopeHint =
      primaryDebug.scopes.length > 0 ? `Granted scopes: ${primaryDebug.scopes.join(", ")}.` : "";
    const granularHint =
      primaryDebug.granularPageIds.length > 0
        ? ` Token lists page IDs ${primaryDebug.granularPageIds.join(", ")} but could not resolve Page tokens — confirm you selected the Page during Facebook login and have CREATE_CONTENT on it.`
        : "";
    const businessHint =
      !primaryDebug.scopes.includes("business_management")
        ? " Pages in Meta Business Suite require business_management — add it to your Login for Business configuration and reconnect."
        : " /me/accounts and /me/assigned_pages returned no Pages. If your Page is in Business Suite, ensure business_management is Ready for testing and reconnect.";
    const envHint = getMetaFacebookPageId()
      ? ` META_FACEBOOK_PAGE_ID=${getMetaFacebookPageId()} is configured but could not resolve a token for it — verify it is the numeric Page ID (not the @username).`
      : "";
    const detailHint =
      resolutionErrors.length > 0 ? ` Details: ${resolutionErrors.slice(0, 2).join("; ")}.` : "";

    return {
      pages: [],
      error:
        "No Facebook Pages found for this token. Select your Page during Facebook login and ensure business_management is enabled in your Login for Business configuration.",
      debugHint: `${scopeHint}${granularHint}${businessHint}${envHint}${detailHint}`.trim() || null,
    };
  }

  return {
    pages,
    error: null,
    debugHint: sources.length > 0 ? `Resolved via ${sources.join(", ")}` : null,
  };
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
  granularPageIds: string[];
  granularInstagramIds: string[];
  granularTargetIds: string[];
  userId: string | null;
  profileId: string | null;
  tokenType: string | null;
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
      granularPageIds: [],
      granularInstagramIds: [],
      granularTargetIds: [],
      userId: null,
      profileId: null,
      tokenType: null,
      error: result.error,
    };
  }

  const data = result.data.data as
    | {
        is_valid?: boolean;
        expires_at?: number;
        scopes?: string[];
        user_id?: string;
        profile_id?: string | number;
        type?: string;
        granular_scopes?: GranularScopeEntry[];
      }
    | undefined;

  const expiresAt =
    typeof data?.expires_at === "number" && data.expires_at > 0
      ? new Date(data.expires_at * 1000).toISOString()
      : null;

  const profileId = normalizeTargetId(data?.profile_id);
  const granularScopes = data?.granular_scopes;

  return {
    ok: true,
    isValid: Boolean(data?.is_valid),
    expiresAt,
    scopes: Array.isArray(data?.scopes) ? data.scopes : [],
    granularPageIds: pageIdsFromGranularScopes(granularScopes),
    granularInstagramIds: instagramIdsFromGranularScopes(granularScopes),
    granularTargetIds: allTargetIdsFromGranularScopes(granularScopes),
    userId: data?.user_id ? String(data.user_id) : null,
    profileId,
    tokenType: data?.type ? String(data.type) : null,
    error: null,
  };
}

export async function verifyMetaConnection(input: {
  pageId: string;
  instagramAccountId?: string;
  accessToken: string;
}): Promise<{ ok: boolean; pageName: string | null; error: string | null }> {
  const probe = await probePageNode({
    pageId: input.pageId,
    accessToken: input.accessToken,
    fieldSets: ["name,instagram_business_account", "name", "id,name"],
  });

  if (!probe.ok) {
    const meAsPage = await probeMeAsPage({
      accessToken: input.accessToken,
      expectedPageId: input.pageId,
    });
    if (!meAsPage) {
      const debug = await debugToken({ inputToken: input.accessToken });
      const envPageId = getMetaFacebookPageId();
      const hasGranularPageAccess =
        debug.isValid &&
        (debug.granularPageIds.includes(input.pageId) ||
          debug.granularTargetIds.includes(input.pageId) ||
          debug.profileId === input.pageId ||
          debug.tokenType?.toUpperCase() === "PAGE");
      const hasEnvPageTrust = Boolean(envPageId && envPageId === input.pageId && debug.isValid);

      if (hasGranularPageAccess || hasEnvPageTrust) {
        return { ok: true, pageName: null, error: null };
      }

      return { ok: false, pageName: null, error: probe.error ?? "Page verification failed." };
    }

    const igId = input.instagramAccountId?.trim() ?? "";
    if (meAsPage.instagramAccountId && igId && meAsPage.instagramAccountId !== igId) {
      return {
        ok: false,
        pageName: meAsPage.name,
        error: `Instagram account mismatch. Page is linked to ${meAsPage.instagramAccountId}.`,
      };
    }

    return { ok: true, pageName: meAsPage.name, error: null };
  }

  const linkedIg = probe.instagramAccountId;
  const igId = input.instagramAccountId?.trim() ?? "";

  if (linkedIg && igId && linkedIg !== igId) {
    return {
      ok: false,
      pageName: probe.name,
      error: `Instagram account mismatch. Page is linked to ${linkedIg}.`,
    };
  }

  return {
    ok: true,
    pageName: probe.name ?? "Facebook Page",
    error: null,
  };
}
