import { revalidateTag, updateTag } from "next/cache";
import { after } from "next/server";
import { PUBLIC_CONTENT_TAG } from "./cache-tags";

/**
 * Call from a Server Action after any change readers can see (stories, homepage,
 * breaking banner, live, photos, bylines, tags, ads). The next visit waits for
 * fresh data, so the newsroom always sees its own change (read-your-own-writes).
 *
 * The cache is cleared a second time two seconds later (D-046). A reader's page
 * that was being built at the very moment of the change could otherwise save the
 * old version just after the first clearing, and a removed banner or unpublished
 * story would stay visible until the next minute.
 */
export function publicContentChanged() {
  updateTag(PUBLIC_CONTENT_TAG);
  after(async () => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    try {
      revalidateTag(PUBLIC_CONTENT_TAG, { expire: 0 });
    } catch (error) {
      console.error("second cache clearing failed", error);
    }
  });
}
