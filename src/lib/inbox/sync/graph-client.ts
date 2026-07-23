import "server-only";

import {
  metaOperationFromPath,
  recordApiCall,
} from "@/lib/ops/record-api-call";

const DEFAULT_GRAPH_VERSION = "v21.0";

type GraphErrorPayload = {
  message?: string;
  code?: number;
  type?: string;
  error_subcode?: number;
};

export type InboxGraphResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; errorCode?: number };

function graphVersion(): string {
  return process.env.META_GRAPH_API_VERSION?.trim() || DEFAULT_GRAPH_VERSION;
}

function graphUrl(path: string): string {
  return `https://graph.facebook.com/${graphVersion()}${path}`;
}

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

export async function inboxGraphGet<T extends Record<string, unknown>>(
  path: string,
  params: Record<string, string>,
): Promise<InboxGraphResult<T>> {
  const startedAt = Date.now();
  const url = new URL(graphUrl(path));
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString());
  const payload = (await response.json()) as T & { error?: GraphErrorPayload };

  if (!response.ok || payload.error) {
    const result = {
      ok: false as const,
      error: formatGraphError(payload.error ?? {}, response.status),
      errorCode: payload.error?.code,
    };
    await recordApiCall({
      provider: "meta",
      operation: metaOperationFromPath("GET", path),
      startedAt,
      success: false,
      httpStatus: response.status,
      errorCode: result.errorCode,
      errorMessage: result.error,
      metadata: { surface: "inbox" },
    });
    return result;
  }

  await recordApiCall({
    provider: "meta",
    operation: metaOperationFromPath("GET", path),
    startedAt,
    success: true,
    httpStatus: response.status,
    metadata: { surface: "inbox" },
  });
  return { ok: true, data: payload };
}

export async function inboxGraphPost<T extends Record<string, unknown>>(
  path: string,
  params: Record<string, string>,
): Promise<InboxGraphResult<T>> {
  const startedAt = Date.now();
  const body = new URLSearchParams(params);
  const response = await fetch(graphUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const payload = (await response.json()) as T & { error?: GraphErrorPayload };

  if (!response.ok || payload.error) {
    const result = {
      ok: false as const,
      error: formatGraphError(payload.error ?? {}, response.status),
      errorCode: payload.error?.code,
    };
    await recordApiCall({
      provider: "meta",
      operation: metaOperationFromPath("POST", path),
      startedAt,
      success: false,
      httpStatus: response.status,
      errorCode: result.errorCode,
      errorMessage: result.error,
      metadata: { surface: "inbox" },
    });
    return result;
  }

  await recordApiCall({
    provider: "meta",
    operation: metaOperationFromPath("POST", path),
    startedAt,
    success: true,
    httpStatus: response.status,
    metadata: { surface: "inbox" },
  });
  return { ok: true, data: payload };
}

export async function inboxGraphDelete<T extends Record<string, unknown>>(
  path: string,
  params: Record<string, string>,
): Promise<InboxGraphResult<T>> {
  const startedAt = Date.now();
  const url = new URL(graphUrl(path));
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), { method: "DELETE" });
  const payload = (await response.json()) as T & { error?: GraphErrorPayload };

  if (!response.ok || payload.error) {
    const result = {
      ok: false as const,
      error: formatGraphError(payload.error ?? {}, response.status),
      errorCode: payload.error?.code,
    };
    await recordApiCall({
      provider: "meta",
      operation: metaOperationFromPath("DELETE", path),
      startedAt,
      success: false,
      httpStatus: response.status,
      errorCode: result.errorCode,
      errorMessage: result.error,
      metadata: { surface: "inbox" },
    });
    return result;
  }

  await recordApiCall({
    provider: "meta",
    operation: metaOperationFromPath("DELETE", path),
    startedAt,
    success: true,
    httpStatus: response.status,
    metadata: { surface: "inbox" },
  });
  return { ok: true, data: payload };
}

export async function inboxGraphGetAllPages<T>(
  firstPath: string,
  params: Record<string, string>,
  extractItems: (payload: Record<string, unknown>) => T[],
  extractNext: (payload: Record<string, unknown>) => string | null,
  maxPages = 3,
): Promise<InboxGraphResult<T[]>> {
  const items: T[] = [];
  let nextUrl: string | null = null;
  let pageCount = 0;

  while (pageCount < maxPages) {
    const result = nextUrl
      ? await fetch(nextUrl).then(async (response) => {
          const payload = (await response.json()) as Record<string, unknown> & {
            error?: GraphErrorPayload;
          };
          if (!response.ok || payload.error) {
            return {
              ok: false as const,
              error: formatGraphError(payload.error ?? {}, response.status),
              errorCode: payload.error?.code,
            };
          }
          return { ok: true as const, data: payload };
        })
      : await inboxGraphGet<Record<string, unknown>>(firstPath, params);

    if (!result.ok) {
      return result;
    }

    items.push(...extractItems(result.data));
    nextUrl = extractNext(result.data);
    pageCount += 1;

    if (!nextUrl) {
      break;
    }
  }

  return { ok: true, data: items };
}

export function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is Record<string, unknown> =>
      typeof item === "object" && item !== null,
  );
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  return value as Record<string, unknown>;
}

export function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export function readIsoTime(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (typeof value === "number") {
    return new Date(value * 1000).toISOString();
  }

  return null;
}

export function snippet(text: string, max = 120): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) {
    return trimmed;
  }

  return `${trimmed.slice(0, max - 1)}…`;
}
