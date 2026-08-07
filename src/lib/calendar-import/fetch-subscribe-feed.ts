import { safeFetch } from "@/lib/security/safe-fetch";

const FETCH_TIMEOUT_MS = 15_000;
const USER_AGENT = "Hey Ralli/1.0 (calendar subscribe sync)";
/** Cap ICS body size to reduce memory DoS from huge feeds. */
const MAX_ICS_BYTES = 5_000_000;

export function normalizeSubscribeFeedUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.toLowerCase().startsWith("webcal://")) {
    return `https://${trimmed.slice("webcal://".length)}`;
  }
  return trimmed;
}

export function validateCalendarSubscribeUrl(
  url: string,
): { valid: true; normalized: string } | { valid: false; error: string } {
  const trimmed = url.trim();
  if (!trimmed) {
    return { valid: true, normalized: "" };
  }

  const normalized = normalizeSubscribeFeedUrl(trimmed);

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return {
      valid: false,
      error: "Enter a valid calendar feed URL (http, https, or webcal).",
    };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      valid: false,
      error: "Calendar feed URL must use http or https (webcal:// is also supported).",
    };
  }

  return { valid: true, normalized: trimmed };
}

export async function fetchSubscribeFeedIcs(
  url: string,
): Promise<{ text: string } | { error: string }> {
  const validation = validateCalendarSubscribeUrl(url);
  if (!validation.valid) {
    return { error: validation.error };
  }

  const fetchUrl = normalizeSubscribeFeedUrl(url.trim());
  const fetched = await safeFetch(
    fetchUrl,
    {
      headers: {
        Accept: "text/calendar, text/plain, */*",
        "User-Agent": USER_AGENT,
      },
    },
    {
      allowHttp: true,
      timeoutMs: FETCH_TIMEOUT_MS,
      maxBytes: MAX_ICS_BYTES,
    },
  );

  if (!fetched.ok) {
    return { error: fetched.error };
  }

  const { response } = fetched;
  if (!response.ok) {
    return {
      error: `Calendar feed returned ${response.status}. Check the URL and try again.`,
    };
  }

  const text = await response.text();
  if (text.length > MAX_ICS_BYTES) {
    return { error: "Calendar feed is too large." };
  }
  if (!text.trim()) {
    return { error: "Calendar feed returned an empty response." };
  }

  if (!/BEGIN:VCALENDAR/i.test(text)) {
    return {
      error: "The URL did not return a valid ICS calendar file.",
    };
  }

  return { text };
}
