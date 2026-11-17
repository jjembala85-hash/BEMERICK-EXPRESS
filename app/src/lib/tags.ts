// Topic tags on stories (e.g. "Elections 2026", "Fuel prices").
import { slugify } from "./slug";

export const MAX_TAGS = 8;
export const MAX_TAG_LENGTH = 40;

export type TagInput = { name: string; slug: string };

/**
 * Reads the editor's comma-separated tag field.
 * Returns the tags in the order typed (repeats removed), or an error to show.
 */
export function parseTags(input: string): { tags: TagInput[] } | { error: string } {
  const tags: TagInput[] = [];
  const seen = new Set<string>();
  for (const part of input.split(",")) {
    const name = part.trim().replace(/\s+/g, " ");
    if (!name) continue;
    if (name.length > MAX_TAG_LENGTH) return { error: `The tag "${name.slice(0, 20)}…" is too long (${MAX_TAG_LENGTH} characters maximum).` };
    const slug = slugify(name);
    if (slug.length < 2) return { error: `"${name}" cannot be used as a tag. Use words or numbers.` };
    if (seen.has(slug)) continue;
    seen.add(slug);
    tags.push({ name, slug });
  }
  if (tags.length > MAX_TAGS) return { error: `Use at most ${MAX_TAGS} tags. Pick the ones readers would follow.` };
  return { tags };
}
