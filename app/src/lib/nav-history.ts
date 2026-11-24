// Remembers, for this page load only, the BX News pages the reader has moved
// through, so "← Back" knows whether the previous page is ours (D-048).
// Kept in memory only: nothing is stored or sent.
const trail: string[] = [];

/** Called by the site header whenever the path changes. */
export function notePath(path: string) {
  if (trail.at(-1) === path) return;
  // Arriving at the page before the current one means the reader went back.
  if (trail.length > 1 && trail.at(-2) === path) trail.pop();
  else trail.push(path);
}

/** True when going back stays on BX News. */
export function previousPageIsOurs() {
  if (trail.length > 1) return true;
  // First page of this visit: ours only if a full page load came from BX News.
  try {
    return document.referrer !== "" && new URL(document.referrer).origin === window.location.origin && window.history.length > 1;
  } catch {
    return false;
  }
}
