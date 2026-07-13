import type { NextConfig } from "next";
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

export default nextConfig;
