// Builds the homepage from the editor's board plus automatic fallbacks
// (Blueprint 8.1-8.2). Pure, so the rules are unit-tested.

export const TOP_SLOTS = 4;

type Card = { id: string; headline: string; priority: string };

export type PlacedSlot<T extends Card> = {
  zone: string;
  position: number;
  pinnedUntil: Date | null;
  overrideHeadline: string | null;
  story: T;
};

export type Homepage<T extends Card> = {
  lead: T | null;
  top: T[];
  latest: T[];
};

/**
 * - An editor's pick counts until its "pin until" time; after that the place falls back.
 * - Lead fallback: the newest story marked "important" or "breaking", else the newest story.
 * - Top Stories fallback: the newest stories not already shown.
 * - A story never appears twice. A homepage-only headline replaces the real one on the homepage.
 */
export function assembleHomepage<T extends Card>(
  slots: PlacedSlot<T>[],
  newestFirst: T[],
  now: Date,
  latestCount = 10,
): Homepage<T> {
  const shown = new Set<string>();
  const live = slots.filter((s) => !s.pinnedUntil || s.pinnedUntil > now);
  const withOverride = (s: PlacedSlot<T>): T =>
    s.overrideHeadline ? { ...s.story, headline: s.overrideHeadline } : s.story;
  const take = (story: T | undefined | null) => {
    if (!story || shown.has(story.id)) return null;
    shown.add(story.id);
    return story;
  };

  const pickedLead = live.find((s) => s.zone === "lead");
  const lead =
    take(pickedLead ? withOverride(pickedLead) : null) ??
    take(newestFirst.find((s) => s.priority !== "normal" && !shown.has(s.id))) ??
    take(newestFirst.find((s) => !shown.has(s.id)));

  const top: T[] = [];
  const pickedTop = live.filter((s) => s.zone === "top").sort((a, b) => a.position - b.position);
  for (const s of pickedTop) {
    const story = take(withOverride(s));
    if (story && top.length < TOP_SLOTS) top.push(story);
  }
  for (const s of newestFirst) {
    if (top.length >= TOP_SLOTS) break;
    const story = take(s);
    if (story) top.push(story);
  }

  const latest = newestFirst.filter((s) => !shown.has(s.id)).slice(0, latestCount);
  return { lead, top, latest };
}

/** Breaking alert durations offered in the newsroom, in hours. */
export const BREAKING_DURATIONS = [1, 3, 6, 12, 24] as const;
