import type { MetadataRoute } from "next";
import { indexingEnabled, siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  if (!indexingEnabled()) {
    // Before launch: nothing is crawled (the build site holds test content).
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/newsroom", "/api/"] },
    sitemap: [`${siteUrl()}/sitemap.xml`, `${siteUrl()}/news-sitemap.xml`],
    host: siteUrl(),
  };
}
