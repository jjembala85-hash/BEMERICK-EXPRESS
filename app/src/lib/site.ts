// Site-wide addresses. The domain is not bought yet (Q-001), so the public
// address comes from Vercel until NEXT_PUBLIC_SITE_URL is set.

/** Full public address, e.g. https://bemerickexpress.vercel.app (no trailing slash). */
export function siteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

/** "bemerickexpress.vercel.app": printed on share images. */
export function siteHost() {
  return new URL(siteUrl()).host;
}

export const WHATSAPP_CHANNEL_URL = "https://whatsapp.com/channel/0029VbEIUUY9Gv7XHrIvKs1O";

// Entries without an href are placeholders until the handles are reserved (roadmap 0.4).
export const followLinks: { name: string; href?: string }[] = [
  { name: "WhatsApp Channel", href: WHATSAPP_CHANNEL_URL },
  { name: "TikTok" },
  { name: "X" },
  { name: "YouTube" },
  { name: "Facebook" },
];

/**
 * Launch switch for search engines. Off until launch (Phase 5): every page says
 * noindex and robots.txt blocks crawlers. Set NEXT_PUBLIC_SITE_INDEXING=on in
 * Vercel's Production settings on launch day.
 */
export function indexingEnabled() {
  return process.env.NEXT_PUBLIC_SITE_INDEXING === "on";
}

export const SITE_NAME = "BEMERICK EXPRESS";
export const PUBLISHER_NAME = "BX News";
