import type { NextConfig } from "next";
import { MAX_EVENT_ASSET_BYTES } from "./src/lib/event-workspace/storage";

const nextConfig: NextConfig = {
  // pdf-parse/pdfjs must not be webpack-bundled (breaks in server actions).
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "mammoth"],
  experimental: {
    serverActions: {
      // Must match MAX_EVENT_ASSET_BYTES in upload validation (10 MB).
      bodySizeLimit: MAX_EVENT_ASSET_BYTES,
    },
  },
};

export default nextConfig;
