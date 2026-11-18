// RSS 2.0 feed of the latest stories (all, or one section).
import { getFeedStories } from "@/lib/queries/public";
import { PUBLISHER_NAME, siteUrl } from "@/lib/site";
import { xmlEscape, xmlResponse } from "@/lib/xml";

export async function rssResponse(options: { sectionSlug?: string; sectionName?: string } = {}) {
  const base = siteUrl();
  const stories = await getFeedStories({ limit: 30, sectionSlug: options.sectionSlug });
  const title = options.sectionName ? `${PUBLISHER_NAME}: ${options.sectionName}` : `${PUBLISHER_NAME}: latest stories`;
  const self = options.sectionSlug ? `${base}/${options.sectionSlug}/rss.xml` : `${base}/rss.xml`;
  const items = stories
    .map((s) => {
      const url = `${base}/${s.sectionSlug}/${s.slug}`;
      return `    <item>
      <title>${xmlEscape(s.headline)}</title>
      <link>${xmlEscape(url)}</link>
      <guid isPermaLink="true">${xmlEscape(url)}</guid>
      <pubDate>${(s.firstPublishedAt ?? s.publishedAt ?? new Date()).toUTCString()}</pubDate>
      <category>${xmlEscape(s.sectionName)}</category>
      ${s.standfirst ? `<description>${xmlEscape(s.standfirst)}</description>` : ""}
      ${s.photo ? `<enclosure url="${xmlEscape(s.photo.src)}" type="${s.photo.src.endsWith(".webp") ? "image/webp" : "image/jpeg"}" length="0"/>` : ""}
    </item>`;
    })
    .join("\n");
  return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(title)}</title>
    <link>${xmlEscape(options.sectionSlug ? `${base}/${options.sectionSlug}` : base)}</link>
    <description>Fast, verified, mobile-first news from Uganda.</description>
    <language>en</language>
    <atom:link href="${xmlEscape(self)}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`);
}
