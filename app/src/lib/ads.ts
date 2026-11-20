// Direct-sold banners (D-044). Ads are images from the photo library with a link;
// they are labelled "Advertisement", never look like stories, and their links
// carry rel="sponsored". No ad network, no tracking scripts, no reader data.

export const AD_SLOTS = {
  home_top: { label: "Homepage, under the lead story", size: "1200 × 300 (4:1)", aspect: "4 / 1" },
  home_mid: { label: "Homepage, between Top stories and Latest", size: "1200 × 300 (4:1)", aspect: "4 / 1" },
  story: { label: "Story pages, after the article", size: "1200 × 300 (4:1)", aspect: "4 / 1" },
  section: { label: "Section pages, above the stories", size: "1200 × 300 (4:1)", aspect: "4 / 1" },
} as const;

export type AdSlot = keyof typeof AD_SLOTS;

export function isAdSlot(value: unknown): value is AdSlot {
  return typeof value === "string" && Object.hasOwn(AD_SLOTS, value);
}

/** Advertiser links must be plain https web addresses. Returns the cleaned URL or null. */
export function parseAdLink(input: string): string | null {
  const raw = input.trim();
  if (!raw || raw.length > 500) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
    if (url.protocol !== "https:" || !url.hostname.includes(".") || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export type AdTiming = { paused: boolean; startsAt: Date; endsAt: Date | null };
export type AdState = "running" | "scheduled" | "paused" | "ended";

export function adState(ad: AdTiming, now: Date): AdState {
  if (ad.endsAt && ad.endsAt <= now) return "ended";
  if (ad.paused) return "paused";
  if (ad.startsAt > now) return "scheduled";
  return "running";
}

export const adStateLabels: Record<AdState, string> = {
  running: "Running",
  scheduled: "Scheduled",
  paused: "Paused",
  ended: "Ended",
};

/**
 * Picks one ad for a slot. Several ads in the same slot take turns: `turn` is a
 * number that changes over time (e.g. the minute), so each gets a fair share.
 */
export function pickAd<T extends { id: string; slots: readonly string[] }>(ads: readonly T[], slot: AdSlot, turn: number): T | null {
  const candidates = ads.filter((a) => a.slots.includes(slot)).sort((a, b) => a.id.localeCompare(b.id));
  if (candidates.length === 0) return null;
  return candidates[Math.abs(Math.trunc(turn)) % candidates.length];
}

/** Click-through rate as a short percentage, e.g. "1.4%". */
export function ctr(views: number, clicks: number) {
  if (views <= 0) return "–";
  return `${((clicks / views) * 100).toFixed(1)}%`;
}
