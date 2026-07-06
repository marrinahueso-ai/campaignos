import "server-only";

const FETCH_TIMEOUT_MS = 12_000;
const USER_AGENT = "CampaignOS-InboxAI/1.0 (+https://campaignos.app)";

export async function fetchPublicPageText(
  url: string,
): Promise<{ text: string } | { error: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Accept: "text/html, text/plain, application/xhtml+xml, */*",
        "User-Agent": USER_AGENT,
      },
    });

    if (!response.ok) {
      return { error: `Page returned ${response.status}` };
    }

    const contentType = response.headers.get("content-type") ?? "";
    const raw = await response.text();

    if (contentType.includes("text/plain")) {
      return { text: normalizeWhitespace(raw).slice(0, 12_000) };
    }

    return { text: extractTextFromHtml(raw).slice(0, 12_000) };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { error: "Request timed out" };
    }

    return { error: "Unable to fetch page" };
  } finally {
    clearTimeout(timeout);
  }
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
