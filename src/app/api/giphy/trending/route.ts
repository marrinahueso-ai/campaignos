import { NextResponse } from "next/server";
import { requireGiphyProxyAccess } from "@/lib/giphy/api-auth";
import { isGiphyConfigured, trendingGiphyGifs } from "@/lib/giphy/client";
import type { GiphyProxyResponse } from "@/lib/giphy/types";

export const dynamic = "force-dynamic";

function parseOffset(raw: string | null): number {
  if (!raw) {
    return 0;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export async function GET(request: Request) {
  const access = await requireGiphyProxyAccess();
  if (!access.ok) {
    return NextResponse.json(
      { configured: false, gifs: [], message: access.error } satisfies GiphyProxyResponse,
      { status: access.status },
    );
  }

  if (!isGiphyConfigured()) {
    const body: GiphyProxyResponse = {
      configured: false,
      gifs: [],
      message: "Add GIPHY_API_KEY to enable GIF search",
      nextOffset: null,
      hasMore: false,
    };
    return NextResponse.json(body);
  }

  const { searchParams } = new URL(request.url);
  const offset = parseOffset(searchParams.get("offset"));
  const result = await trendingGiphyGifs({ offset });
  const body: GiphyProxyResponse = {
    configured: true,
    gifs: result.gifs,
    message: result.error,
    nextOffset: result.nextOffset,
    hasMore: result.hasMore,
  };
  return NextResponse.json(body, { status: result.error && result.gifs.length === 0 ? 502 : 200 });
}
