// schema.org structured data (Architecture §9) so search engines understand
// stories, bulletins and live streams.
import { PUBLISHER_NAME, SITE_NAME, siteUrl, WHATSAPP_CHANNEL_URL } from "./site";

type Json = Record<string, unknown>;

export function organization(): Json {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    "@id": `${base}/#organization`,
    name: SITE_NAME,
    alternateName: PUBLISHER_NAME,
    url: base,
    logo: { "@type": "ImageObject", url: `${base}/icons/icon-512.png`, width: 512, height: 512 },
    sameAs: [WHATSAPP_CHANNEL_URL],
    correctionsPolicy: `${base}/corrections`,
    ethicsPolicy: `${base}/editorial-policy`,
  };
}

export function website(): Json {
  const base = siteUrl();
  return { "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: base, publisher: { "@id": `${base}/#organization` } };
}

export type ArticleData = {
  path: string;
  headline: string;
  description: string | null;
  section: string;
  sectionPath: string;
  published: Date | null;
  modified: Date | null;
  images: string[];
  authors: { name: string; path: string | null }[];
  video?: { id: string } | null;
};

export function newsArticle(a: ArticleData): Json {
  const base = siteUrl();
  const url = `${base}${a.path}`;
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    headline: a.headline.slice(0, 110),
    description: a.description ?? undefined,
    articleSection: a.section,
    image: a.images.map((src) => (src.startsWith("http") ? src : `${base}${src}`)),
    datePublished: a.published?.toISOString(),
    dateModified: (a.modified ?? a.published)?.toISOString(),
    author: a.authors.length
      ? a.authors.map((p) => ({ "@type": "Person", name: p.name, url: p.path ? `${base}${p.path}` : undefined }))
      : [{ "@type": "Organization", name: SITE_NAME, url: base }],
    publisher: { "@id": `${base}/#organization`, "@type": "NewsMediaOrganization", name: SITE_NAME, logo: { "@type": "ImageObject", url: `${base}/icons/icon-512.png` } },
    isAccessibleForFree: true,
    ...(a.video
      ? {
          video: {
            "@type": "VideoObject",
            name: a.headline,
            description: a.description ?? a.headline,
            thumbnailUrl: a.images.map((src) => (src.startsWith("http") ? src : `${base}${src}`)),
            uploadDate: a.published?.toISOString(),
            embedUrl: `https://www.youtube-nocookie.com/embed/${a.video.id}`,
            contentUrl: `https://www.youtube.com/watch?v=${a.video.id}`,
          },
        }
      : {}),
  };
}

export function breadcrumbs(items: { name: string; path: string }[]): Json {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: `${base}${item.path}` })),
  };
}

/** A live stream on /live, marked as a live broadcast while on air. */
export function liveBroadcast(s: { title: string; summary: string | null; started: Date | null; videoId: string }): Json {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: s.title,
    description: s.summary ?? s.title,
    thumbnailUrl: [`${base}/icons/icon-512.png`],
    uploadDate: s.started?.toISOString(),
    embedUrl: `https://www.youtube-nocookie.com/embed/${s.videoId}`,
    publication: { "@type": "BroadcastEvent", isLiveBroadcast: true, startDate: s.started?.toISOString() },
  };
}

/** JSON for a <script type="application/ld+json">, safe against "</script>" in headlines. */
export function jsonLdText(data: Json | Json[]) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
