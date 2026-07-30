import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";
import { MAX_EVENT_ASSET_BYTES } from "./src/lib/event-workspace/storage";

const nextConfig: NextConfig = {
  // Dev and build share a distDir by default, which is unsafe: running `next
  // build` (e.g. to verify a fix before pushing) while `next dev` is still
  // running overwrites the webpack chunks the live dev server has already
  // loaded into memory, causing "Cannot find module './NNNN.js'" crashes
  // (see vercel/next.js#61228). Isolating dev output avoids that race.
  // Vercel always runs a fresh `next build` (NODE_ENV=production), so this
  // does not affect production deploys.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  // pdf-parse/pdfjs must not be webpack-bundled (breaks in server actions).
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "mammoth"],
  images: {
    // Generated and uploaded artwork uses versioned storage paths. Keep the
    // optimized derivative at the CDN for a day instead of revalidating every
    // minute on list-heavy operational hubs.
    minimumCacheTTL: 86_400,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/sign/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/render/image/public/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      // Must match MAX_EVENT_ASSET_BYTES in upload validation (10 MB).
      bodySizeLimit: MAX_EVENT_ASSET_BYTES,
    },
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "campaignos-six.vercel.app" }],
        destination: "https://heyralli.com/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

// Generous-but-real allowlist rather than a nonce-based strict CSP — the
// goal here is closing off the obviously dangerous vectors (framing,
// unexpected script/object origins, MIME sniffing) without a live-testing
// pass across every page. 'unsafe-inline'/'unsafe-eval' on script-src is a
// known trade-off; tightening to nonces is a good follow-up, not a blocker.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://cdn.jsdelivr.net",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://*.ingest.us.sentry.io https://vitals.vercel-insights.com",
  "frame-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const analyzeEnabled = process.env.ANALYZE === "true";

const configWithAnalyzer = withBundleAnalyzer({
  enabled: analyzeEnabled,
})(nextConfig);

/** Match runtime `isSentryEnabled`: off in local dev unless SENTRY_ENABLED=true. */
const sentryEnabled =
  process.env.SENTRY_ENABLED !== "false" &&
  Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()) &&
  (process.env.SENTRY_ENABLED === "true" ||
    process.env.NODE_ENV !== "development");

// Skip withSentryConfig in local/dev — the webpack plugin is a large memory cost
// even when Sentry.init({ enabled: false }).
export default sentryEnabled
  ? withSentryConfig(configWithAnalyzer, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      // Only upload source maps when an auth token is present (CI / Vercel).
      silent: true,
      widenClientFileUpload: true,
      disableLogger: true,
      automaticVercelMonitors: false,
      sourcemaps: {
        disable: !process.env.SENTRY_AUTH_TOKEN || !sentryEnabled,
      },
      telemetry: false,
    })
  : configWithAnalyzer;
