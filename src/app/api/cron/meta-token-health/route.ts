import { NextResponse } from "next/server";
import { refreshAllMetaConnectionHealth } from "@/lib/meta-publishing/connection-token-health";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV === "development";
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await refreshAllMetaConnectionHealth();

  return NextResponse.json({
    ok: true,
    organizationsProcessed: result.organizationsProcessed,
    invalidTokens: result.results.filter((entry) => entry.reconnectRequired).length,
    results: result.results,
  });
}

export async function POST(request: Request) {
  return GET(request);
}
