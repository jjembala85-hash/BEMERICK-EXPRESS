import type { MetadataRoute } from "next";
import { sections } from "@/lib/sections";
import { getFeedStories, getSitemapExtras } from "@/lib/queries/public";
import { siteUrl } from "@/lib/site";

// Search engines read this at /sitemap.xml. Stories newest first, up to the
// 5,000 most recent (well under the 50,000-URL limit for one file).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [stories, { authors, topics }] = await Promise.all([getFeedStories({ limit: 5000 }), getSitemapExtras()]);
  const now = new Date();
  const fixed = ["", "/live", "/bulletins", "/latest", "/corrections", "/about", "/about/team", "/contact", "/advertise", "/editorial-policy", "/privacy", "/terms", "/cookies"];
  return [
    ...fixed.map((path) => ({ url: `${base}${path}`, lastModified: now, changeFrequency: path === "" ? ("hourly" as const) : ("weekly" as const), priority: path === "" ? 1 : 0.4 })),
    ...sections.map((s) => ({ url: `${base}/${s.slug}`, lastModified: now, changeFrequency: "hourly" as const, priority: 0.8 })),
    ...stories.map((s) => ({
      url: `${base}/${s.sectionSlug}/${s.slug}`,
      lastModified: s.updatedPublicAt ?? s.publishedAt ?? now,
      changeFrequency: "daily" as const,
      priority: 0.7,
      images: s.photo ? [s.photo.src] : undefined,
    })),
    ...authors.map((a) => ({ url: `${base}/author/${a.slug}`, lastModified: a.updatedAt, changeFrequency: "weekly" as const, priority: 0.3 })),
    ...topics.map((t) => ({ url: `${base}/topic/${t.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.5 })),
  ];
}
