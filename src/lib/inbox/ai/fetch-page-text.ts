import "server-only";

import { isLikelyAuthWall } from "@/lib/inbox/ai/draft-templates";
import { safeFetch } from "@/lib/security/safe-fetch";

const FETCH_TIMEOUT_MS = 12_000;
const USER_AGENT = "HeyRalli-InboxAI/1.0 (+https://heyralli.com)";
const MAX_PAGE_BYTES = 2_000_000;

export async function fetchPublicPageText(
  url: string,
): Promise<{ text: string } | { error: string }> {
  const fetched = await safeFetch(
    url,
    {
      headers: {
        Accept: "text/html, text/plain, application/xhtml+xml, */*",
        "User-Agent": USER_AGENT,
      },
    },
    {
      allowHttp: false,
      timeoutMs: FETCH_TIMEOUT_MS,
      maxBytes: MAX_PAGE_BYTES,
    },
  );

  if (!fetched.ok) {
    return { error: fetched.error };
  }

  const { response } = fetched;
  if (!response.ok) {
    return { error: `Page returned ${response.status}` };
  }

  const contentType = response.headers.get("content-type") ?? "";
  const raw = await response.text();
  if (raw.length > MAX_PAGE_BYTES) {
    return { error: "Page response is too large" };
  }

  if (contentType.includes("text/plain")) {
    const text = normalizeWhitespace(raw).slice(0, 12_000);
    if (isLikelyAuthWall(text)) {
      return { error: "Page requires sign-in (no public content)" };
    }
    return { text };
  }

  const text = extractTextFromHtml(raw).slice(0, 12_000);
  if (isLikelyAuthWall(text)) {
    return { error: "Page requires sign-in (no public content)" };
  }

  return { text };
}

function extractTextFromHtml(html: string): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");

  const withBreaks = withoutScripts
    .replace(/<\/(p|div|li|h1|h2|h3|h4|h5|h6|tr|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"');

  return normalizeWhitespace(withBreaks);
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
