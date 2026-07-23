import { NextResponse } from "next/server";
import { requireGiphyProxyAccess } from "@/lib/giphy/api-auth";
import { isGiphyConfigured, trendingGiphyGifs } from "@/lib/giphy/client";
import type { GiphyProxyResponse } from "@/lib/giphy/types";

export const dynamic = "force-dynamic";

export async function GET() {
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
    };
    return NextResponse.json(body);
  }

  const result = await trendingGiphyGifs();
  const body: GiphyProxyResponse = {
    configured: true,
    gifs: result.gifs,
    message: result.error,
  };
  return NextResponse.json(body, { status: result.error && result.gifs.length === 0 ? 502 : 200 });
}
