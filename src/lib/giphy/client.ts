import "server-only";

import type { GiphyGifSummary } from "@/lib/giphy/types";

const GIPHY_API_BASE = "https://api.giphy.com/v1/gifs";
/** School / PTO-safe content filter (includes G + PG). */
export const GIPHY_RATING = "pg";
const MAX_SEND_BYTES = 8 * 1024 * 1024;
const DEFAULT_LIMIT = 24;

type GiphyImageRendition = {
  url?: string;
  size?: string;
  width?: string;
  height?: string;
};

type GiphyApiGif = {
  id?: string;
  title?: string;
  images?: {
    fixed_height?: GiphyImageRendition;
    fixed_height_small?: GiphyImageRendition;
    downsized?: GiphyImageRendition;
    downsized_medium?: GiphyImageRendition;
    downsized_large?: GiphyImageRendition;
  };
};

type GiphyApiResponse = {
  data?: GiphyApiGif[];
};

export function getGiphyApiKey(): string | null {
  const key = process.env.GIPHY_API_KEY?.trim();
  return key || null;
}

export function isGiphyConfigured(): boolean {
  return Boolean(getGiphyApiKey());
}

/** True when the URL is an HTTPS Giphy CDN asset (for send-path validation). */
export function isAllowedGiphyCdnUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    return host === "giphy.com" || host.endsWith(".giphy.com");
  } catch {
    return false;
  }
}

function renditionBytes(rendition: GiphyImageRendition | undefined): number | null {
  if (!rendition?.size) {
    return null;
  }
  const parsed = Number.parseInt(rendition.size, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Prefer size-safe Giphy renditions for Meta DM image attachments (≤8MB).
 * Order: downsized (≤2MB) → fixed_height → downsized_medium (≤5MB) → downsized_large (≤8MB).
 */
export function pickSizeSafeSendUrl(
  images: GiphyApiGif["images"] | undefined,
): string | null {
  if (!images) {
    return null;
  }

  const candidates = [
    images.downsized,
    images.fixed_height,
    images.downsized_medium,
    images.downsized_large,
  ];

  for (const candidate of candidates) {
    const url = candidate?.url?.trim();
    if (!url || !isAllowedGiphyCdnUrl(url)) {
      continue;
    }
    const bytes = renditionBytes(candidate);
    if (bytes != null && bytes > MAX_SEND_BYTES) {
      continue;
    }
    return url;
  }

  return null;
}

function pickPreviewUrl(images: GiphyApiGif["images"] | undefined): string | null {
  if (!images) {
    return null;
  }
  const url =
    images.fixed_height_small?.url?.trim() ||
    images.fixed_height?.url?.trim() ||
    null;
  if (!url || !isAllowedGiphyCdnUrl(url)) {
    return null;
  }
  return url;
}

function mapGif(gif: GiphyApiGif): GiphyGifSummary | null {
  const id = gif.id?.trim();
  if (!id) {
    return null;
  }
  const sendUrl = pickSizeSafeSendUrl(gif.images);
  const previewUrl = pickPreviewUrl(gif.images) ?? sendUrl;
  if (!sendUrl || !previewUrl) {
    return null;
  }
  return {
    id,
    title: gif.title?.trim() || "GIF",
    previewUrl,
    sendUrl,
  };
}

async function giphyGet(
  path: "search" | "trending",
  params: Record<string, string>,
): Promise<{ gifs: GiphyGifSummary[]; error: string | null }> {
  const apiKey = getGiphyApiKey();
  if (!apiKey) {
    return {
      gifs: [],
      error: "Add GIPHY_API_KEY to enable GIF search",
    };
  }

  const url = new URL(`${GIPHY_API_BASE}/${path}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("rating", GIPHY_RATING);
  url.searchParams.set("limit", String(DEFAULT_LIMIT));
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      console.error("Giphy API error:", response.status, await response.text());
      return { gifs: [], error: "Giphy is temporarily unavailable. Try again shortly." };
    }

    const payload = (await response.json()) as GiphyApiResponse;
    const gifs = (payload.data ?? [])
      .map(mapGif)
      .filter((gif): gif is GiphyGifSummary => gif != null);

    return { gifs, error: null };
  } catch (error) {
    console.error("Giphy request failed:", error);
    return { gifs: [], error: "Could not reach Giphy. Check your connection and try again." };
  }
}

export async function searchGiphyGifs(query: string): Promise<{
  gifs: GiphyGifSummary[];
  error: string | null;
}> {
  const q = query.trim();
  if (!q) {
    return trendingGiphyGifs();
  }
  return giphyGet("search", { q });
}

export async function trendingGiphyGifs(): Promise<{
  gifs: GiphyGifSummary[];
  error: string | null;
}> {
  return giphyGet("trending", {});
}
