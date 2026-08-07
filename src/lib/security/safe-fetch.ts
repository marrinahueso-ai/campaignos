import "server-only";

import {
  assertSafeOutboundUrlResolved,
  type SafeOutboundUrlOptions,
} from "@/lib/security/safe-outbound-url";

const DEFAULT_MAX_REDIRECTS = 3;

export type SafeFetchOptions = SafeOutboundUrlOptions & {
  timeoutMs?: number;
  maxRedirects?: number;
  maxBytes?: number;
};

export type SafeFetchResult =
  | { ok: true; response: Response; finalUrl: string }
  | { ok: false; error: string };

/**
 * Server-side fetch that blocks private/metadata targets and re-validates
 * every redirect hop (mitigates classic cloud SSRF / DNS rebinding).
 */
export async function safeFetch(
  rawUrl: string,
  init: RequestInit = {},
  options: SafeFetchOptions = {},
): Promise<SafeFetchResult> {
  const timeoutMs = options.timeoutMs ?? 15_000;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const maxBytes = options.maxBytes;

  let current = rawUrl.trim();
  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const validated = await assertSafeOutboundUrlResolved(current, options);
    if (!validated.ok) {
      return { ok: false, error: validated.error };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const { signal: _ignored, redirect: _ignoredRedirect, ...rest } = init;

    try {
      const response = await fetch(validated.url.toString(), {
        ...rest,
        redirect: "manual",
        signal: controller.signal,
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) {
          return { ok: false, error: "Redirect missing Location header." };
        }
        if (hop === maxRedirects) {
          return { ok: false, error: "Too many redirects." };
        }
        current = new URL(location, validated.url).toString();
        continue;
      }

      if (maxBytes != null && maxBytes > 0) {
        const declared = Number(response.headers.get("content-length") ?? "0");
        if (Number.isFinite(declared) && declared > maxBytes) {
          return { ok: false, error: "Response is too large." };
        }
      }

      return {
        ok: true,
        response,
        finalUrl: validated.url.toString(),
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return { ok: false, error: "Request timed out." };
      }
      return { ok: false, error: "Unable to fetch URL." };
    } finally {
      clearTimeout(timeout);
    }
  }

  return { ok: false, error: "Too many redirects." };
}
