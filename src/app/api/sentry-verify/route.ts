import { NextResponse } from "next/server";
import {
  captureSentryServerTestError,
  isSentryTestAuthorized,
} from "@/lib/monitoring/sentry-verify";
import { isSentryEnabled } from "@/lib/monitoring/sentry-privacy";

export const dynamic = "force-dynamic";

/**
 * Temporary production verification endpoint.
 * Requires Authorization: Bearer $CRON_SECRET (or ?secret=).
 * Disable by removing CRON_SECRET access or deleting this route after verify.
 */
export async function GET(request: Request) {
  if (!isSentryTestAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const side = url.searchParams.get("side") || "server";

  if (side === "status") {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || "";
    const looksLikeDsn = /^https:\/\/.+@.+\/\d+$/.test(dsn);
    return NextResponse.json({
      ok: true,
      side: "status",
      sentryEnabled: isSentryEnabled(),
      dsnConfigured: Boolean(dsn),
      dsnLooksValid: looksLikeDsn,
      dsnLength: dsn.length,
      orgConfigured: Boolean(process.env.SENTRY_ORG?.trim()),
      project: process.env.SENTRY_PROJECT || null,
      environment:
        process.env.SENTRY_ENVIRONMENT ||
        process.env.VERCEL_ENV ||
        process.env.NODE_ENV ||
        null,
      verifySecretConfigured: Boolean(
        process.env.SENTRY_VERIFY_SECRET?.trim() || process.env.CRON_SECRET?.trim(),
      ),
      sdkPackage: "@sentry/nextjs",
    });
  }

  if (!isSentryEnabled()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Sentry is not enabled in this deployment (missing DSN or SENTRY_ENABLED=false).",
      },
      { status: 503 },
    );
  }

  if (side === "server") {
    const result = await captureSentryServerTestError();
    if (!result.ok) {
      return NextResponse.json(result, { status: 503 });
    }
    return NextResponse.json({
      ok: true,
      side: "server",
      message: "Server test error captured. Check Sentry Issues for sentry_verify=server.",
    });
  }

  return NextResponse.json({
    ok: false,
    error: "Use /dev/sentry-verify?secret=... for the browser-side test.",
  }, { status: 400 });
}
