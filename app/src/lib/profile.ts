/**
 * Reads an X (Twitter) handle typed as "@name", "name" or a profile link.
 * Returns the bare handle, null when empty, or false when it is not valid.
 */
export function parseXHandle(input: string): string | null | false {
  const text = input.trim();
  if (!text) return null;
  const fromLink = text.match(/^(?:https?:\/\/)?(?:www\.)?(?:x|twitter)\.com\/([^/?#]+)\/?(?:[?#].*)?$/i);
  const handle = (fromLink ? fromLink[1] : text).replace(/^@/, "");
  return /^[A-Za-z0-9_]{1,15}$/.test(handle) ? handle : false;
}
