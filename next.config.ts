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
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
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
};

const analyzeEnabled = process.env.ANALYZE === "true";

const configWithAnalyzer = withBundleAnalyzer({
  enabled: analyzeEnabled,
})(nextConfig);

const sentryEnabled = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()) &&
  process.env.SENTRY_ENABLED !== "false";

export default withSentryConfig(configWithAnalyzer, {
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
});
