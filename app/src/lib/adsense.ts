// Google AdSense (Phase 6, D-049). Everything is off until the owner sets the
// ids in Vercel and redeploys:
//   NEXT_PUBLIC_ADSENSE_CLIENT = ca-pub-1234567890123456  → verification meta tag + /ads.txt
//                                                           (enough to apply for AdSense)
//   NEXT_PUBLIC_ADSENSE_SLOT   = 1234567890               → consent banner + ads
// Google's script is loaded only after a reader taps "Accept" (consent.ts), and
// only in places where no direct-sold banner is running.

type Env = Record<string, string | undefined>;

/** The publisher id ("ca-pub-…"), or null when missing or mistyped. */
export function adsenseClient(env: Env = process.env): string | null {
  const value = env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim() ?? "";
  return /^ca-pub-\d{10,20}$/.test(value) ? value : null;
}

/** The display ad unit id (digits only), or null. */
export function adsenseSlot(env: Env = process.env): string | null {
  const value = env.NEXT_PUBLIC_ADSENSE_SLOT?.trim() ?? "";
  return /^\d{6,20}$/.test(value) ? value : null;
}

/** Ads (and therefore the consent banner) are shown only when both ids are set. */
export function adsenseEnabled(env: Env = process.env): boolean {
  return adsenseClient(env) !== null && adsenseSlot(env) !== null;
}

/** Contents of /ads.txt: tells buyers that Google may sell ads on this site. */
export function adsTxt(client: string): string {
  // f08c47fec0942fa0 is Google's fixed certification authority id.
  return `google.com, ${client.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0\n`;
}
