import type { NextConfig } from "next";
import { MAX_EVENT_ASSET_BYTES } from "./src/lib/event-workspace/storage";

const nextConfig: NextConfig = {
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
