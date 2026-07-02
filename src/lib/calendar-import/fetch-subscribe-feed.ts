const FETCH_TIMEOUT_MS = 15_000;
const USER_AGENT = "CampaignOS/1.0 (calendar subscribe sync)";

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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(fetchUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Accept: "text/calendar, text/plain, */*",
        "User-Agent": USER_AGENT,
      },
    });

    if (!response.ok) {
      return {
        error: `Calendar feed returned ${response.status}. Check the URL and try again.`,
      };
    }

    const text = await response.text();
    if (!text.trim()) {
      return { error: "Calendar feed returned an empty response." };
    }

    if (!/BEGIN:VCALENDAR/i.test(text)) {
      return {
        error: "The URL did not return a valid ICS calendar file.",
      };
    }

    return { text };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { error: "Calendar feed request timed out. Try again later." };
    }
    console.error("Failed to fetch calendar subscribe feed:", error);
    return { error: "Unable to fetch calendar feed. Check the URL and try again." };
  } finally {
    clearTimeout(timeout);
  }
}
