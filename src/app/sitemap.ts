import type { MetadataRoute } from "next";
import { DEFAULT_SITE_URL } from "@/lib/site/url";

const PUBLIC_PATHS = ["/", "/features", "/about", "/pricing", "/login"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PUBLIC_PATHS.map((path) => ({
    url: `${DEFAULT_SITE_URL}${path === "/" ? "" : path}`,
    lastModified,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
