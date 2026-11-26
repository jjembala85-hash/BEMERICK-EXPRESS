// A reader's choice about advertising cookies (D-049). Kept only in the
// reader's own browser (local storage), never sent to BX News. Asked again
// after 12 months, or sooner if they reopen it from "Cookie settings".

export type Consent = "yes" | "no" | "unset";

export const CONSENT_KEY = "bx-consent";
/** Fired on window when the choice changes in this tab. */
export const CONSENT_EVENT = "bx-consent";
/** Fired on window to show the banner again ("Cookie settings"). */
export const CONSENT_OPEN_EVENT = "bx-consent-open";

const MAX_AGE_MS = 365 * 86400_000;

/** Reads a stored choice. Missing, damaged, future-dated or expired → "unset". */
export function parseConsent(raw: string | null, now = Date.now()): Consent {
  if (!raw) return "unset";
  try {
    const value = JSON.parse(raw) as { ads?: unknown; at?: unknown };
    const at = typeof value.at === "string" ? Date.parse(value.at) : NaN;
    if (!Number.isFinite(at) || at > now + 60_000 || now - at > MAX_AGE_MS) return "unset";
    if (value.ads === true) return "yes";
    if (value.ads === false) return "no";
    return "unset";
  } catch {
    return "unset";
  }
}

export function serializeConsent(ads: boolean, now = new Date()): string {
  return JSON.stringify({ ads, at: now.toISOString() });
}

// Browser-only helpers below.

// Fallback when local storage is unavailable (private mode in some browsers).
let memoryChoice: boolean | null = null;

function readStored(): Consent {
  try {
    return parseConsent(window.localStorage.getItem(CONSENT_KEY));
  } catch {
    return "unset";
  }
}

export function readConsent(): Consent {
  const stored = readStored();
  if (stored !== "unset" || memoryChoice === null) return stored;
  return memoryChoice ? "yes" : "no";
}

export function subscribeConsent(callback: () => void) {
  window.addEventListener(CONSENT_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CONSENT_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/**
 * Saves the choice. Withdrawing consent after Google's script has loaded
 * reloads the page, because a loaded script cannot be unloaded.
 */
export function saveConsent(ads: boolean) {
  const before = readConsent();
  memoryChoice = ads;
  try {
    window.localStorage.setItem(CONSENT_KEY, serializeConsent(ads));
  } catch {
    // Storage blocked: the choice lasts until the page is closed.
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
  if (before === "yes" && !ads && document.querySelector("script[data-bx-adsense]")) window.location.reload();
}
