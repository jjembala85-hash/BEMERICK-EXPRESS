// Google News sitemap: stories from the last 48 hours (Google's rule), max 1,000.
import { getFeedStories } from "@/lib/queries/public";
import { PUBLISHER_NAME, siteUrl } from "@/lib/site";
import { xmlEscape, xmlResponse } from "@/lib/xml";

export async function GET() {
  const base = siteUrl();
  const stories = await getFeedStories({ limit: 1000, since: new Date(Date.now() - 48 * 3600 * 1000) });
  const urls = stories
    .map(
      (s) => `  <url>
    <loc>${xmlEscape(`${base}/${s.sectionSlug}/${s.slug}`)}</loc>
    <news:news>
      <news:publication><news:name>${xmlEscape(PUBLISHER_NAME)}</news:name><news:language>en</news:language></news:publication>
      <news:publication_date>${(s.firstPublishedAt ?? s.publishedAt ?? new Date()).toISOString()}</news:publication_date>
      <news:title>${xmlEscape(s.headline)}</news:title>
    </news:news>
  </url>`,
    )
    .join("\n");
  return xmlResponse(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>
`,
    120,
  );
}
