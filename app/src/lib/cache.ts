import { updateTag } from "next/cache";
import { PUBLIC_CONTENT_TAG } from "./cache-tags";

/**
 * Call from a Server Action after any change readers can see (stories, homepage,
 * breaking banner, live, photos, bylines, tags). The next visit waits for fresh
 * data, so the newsroom always sees its own change (read-your-own-writes).
 */
export function publicContentChanged() {
  updateTag(PUBLIC_CONTENT_TAG);
}
