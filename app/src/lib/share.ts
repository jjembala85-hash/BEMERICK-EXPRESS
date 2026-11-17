// Share kit text (Blueprint §10): ready-to-post wording for WhatsApp, X and a
// TikTok script prompt. Pure functions, safe in the browser and on the server.

export type ShareFormatName = "link" | "square" | "story";

/** Address of a story's share image. `version` (last update) makes apps fetch a fresh copy after edits. */
export function shareImagePath(section: string, slug: string, format: ShareFormatName, version?: Date | null) {
  const v = version ? `?v=${Math.floor(version.getTime() / 1000)}` : "";
  return `/share/${section}/${slug}/${format}${v}`;
}

export type ShareStory = {
  headline: string;
  standfirst: string | null;
  section: string;
  url: string;
  breaking?: boolean;
  tags?: string[];
  /** Plain text of the body, for TikTok key facts. */
  body?: string;
  host: string;
};

/** WhatsApp formatting: *bold*. Kicker emoji, headline, one-line summary, link. */
export function whatsappText(s: ShareStory) {
  const kicker = s.breaking ? "🔴 *BREAKING*" : `📰 *${s.section.toUpperCase()}*`;
  return [kicker, `*${s.headline.replace(/\*/g, "")}*`, s.standfirst?.trim() || null, `Read more: ${s.url}`]
    .filter(Boolean)
    .join("\n\n");
}

/** "Fuel prices" -> "#FuelPrices". Null if nothing usable is left. */
export function hashtag(tag: string) {
  const words = tag.normalize("NFKD").replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  const joined = words.map((w) => w[0].toUpperCase() + w.slice(1)).join("");
  return /^\d+$/.test(joined) ? null : `#${joined}`;
}

/** X counts every link as 23 characters. */
export const X_LIMIT = 280;
export const X_LINK_LENGTH = 23;

export function xLength(text: string) {
  return text.replace(/https?:\/\/\S+/g, "x".repeat(X_LINK_LENGTH)).length;
}

/** Headline + link + up to two hashtags, trimmed to fit X's limit. */
export function xText(s: ShareStory) {
  const prefix = s.breaking ? "BREAKING: " : "";
  const tags = (s.tags ?? []).map(hashtag).filter((t): t is string => Boolean(t)).slice(0, 2);
  let headline = prefix + s.headline;
  const build = (h: string, t: string[]) => [h, s.url, t.join(" ")].filter(Boolean).join("\n\n");
  let text = build(headline, tags);
  while (xLength(text) > X_LIMIT && tags.length > 0) {
    tags.pop();
    text = build(headline, tags);
  }
  if (xLength(text) > X_LIMIT) {
    // Room left after the link and the blank line between headline and link.
    const room = X_LIMIT - X_LINK_LENGTH - 2;
    headline = headline.slice(0, Math.max(0, room - 1)).trimEnd() + "…";
    text = build(headline, []);
  }
  return text;
}

/** First complete sentences of the story, for the TikTok prompt. */
export function keySentences(text: string, count = 3) {
  return (text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+(?=\s|$)/g) ?? [])
    .map((s) => s.trim())
    .filter((s) => s.split(" ").length >= 4)
    .slice(0, count);
}

/** Prompt for the BX anchor format: hook, three facts, sign-off. Facts must be checked against the story. */
export function tiktokScript(s: ShareStory) {
  const facts = keySentences(`${s.standfirst ?? ""} ${s.body ?? ""}`);
  return [
    `HOOK (first 3 seconds): ${s.headline}`,
    "",
    "THREE THINGS TO KNOW:",
    ...(facts.length ? facts.map((f, i) => `${i + 1}. ${f}`) : ["1. …", "2. …", "3. …"]),
    "",
    `SIGN-OFF: "That's the story. Full details at ${s.host}. Follow BX News for more."`,
    "",
    `On-screen text: ${s.headline}`,
  ].join("\n");
}
