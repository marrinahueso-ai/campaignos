import type { MetadataRoute } from "next";
import { DEFAULT_SITE_URL } from "@/lib/site/url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/"],
    },
    sitemap: `${DEFAULT_SITE_URL}/sitemap.xml`,
    host: DEFAULT_SITE_URL.replace(/^https?:\/\//, ""),
  };
}
