// Breaking-news alerts by Web Push (D-044). Free: browsers deliver them through
// their own push services (Google, Mozilla, Apple, Microsoft); we sign each
// message with our VAPID key. Only the browser's push address and its two
// encryption keys are stored: no name, email, IP address or device details.
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { pushSubscription } from "@/db/schema";
import { siteUrl } from "@/lib/site";

export type PushKeys = { endpoint: string; p256dh: string; auth: string };

/** Ready when the VAPID key pair is configured. */
export function pushConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

const B64URL = /^[A-Za-z0-9_-]+={0,2}$/;

/** Checks what a browser sent when subscribing. Push addresses are always https. */
export function parseSubscription(input: unknown): PushKeys | null {
  if (!input || typeof input !== "object") return null;
  const o = input as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  const endpoint = typeof o.endpoint === "string" ? o.endpoint : "";
  const p256dh = typeof o.keys?.p256dh === "string" ? o.keys.p256dh : "";
  const auth = typeof o.keys?.auth === "string" ? o.keys.auth : "";
  if (endpoint.length > 1000 || p256dh.length > 200 || auth.length > 100) return null;
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:" || url.username || url.password) return null;
  } catch {
    return null;
  }
  if (!B64URL.test(p256dh) || !B64URL.test(auth) || p256dh.length < 40 || auth.length < 10) return null;
  return { endpoint, p256dh, auth };
}

export type AlertMessage = { title: string; body: string; path: string };

/** What the service worker (public/sw.js) receives. Kept small: push messages are limited to ~4 KB. */
export function alertPayload(m: AlertMessage) {
  return JSON.stringify({
    title: m.title.slice(0, 80),
    body: m.body.slice(0, 200),
    url: m.path.startsWith("/") ? m.path : "/",
    tag: "bx-breaking",
  });
}

/**
 * Sends one alert to every subscriber. Browsers that have unsubscribed or
 * expired (404/410) are removed. Returns how many were delivered.
 */
export async function sendAlertToAll(message: AlertMessage) {
  if (!pushConfigured()) return { sent: 0, removed: 0, failed: 0 };
  const webpush = (await import("web-push")).default;
  // Push services want an https contact address; a local test server is http.
  const subject = siteUrl().startsWith("https://") ? siteUrl() : "https://bemerickexpress.vercel.app";
  webpush.setVapidDetails(subject, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  const db = getDb();
  const subs = await db.select().from(pushSubscription);
  const payload = alertPayload(message);
  const gone: string[] = [];
  const delivered: string[] = [];
  let failed = 0;

  // A few at a time, so a large list does not open thousands of connections at once.
  for (let i = 0; i < subs.length; i += 50) {
    await Promise.all(
      subs.slice(i, i + 50).map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 6 * 3600, urgency: "high", topic: "bx-breaking" });
          delivered.push(s.id);
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) gone.push(s.id);
          else failed++;
        }
      }),
    );
  }
  if (gone.length) await db.delete(pushSubscription).where(inArray(pushSubscription.id, gone));
  if (delivered.length) {
    for (let i = 0; i < delivered.length; i += 500) {
      await db.update(pushSubscription).set({ lastSentAt: new Date() }).where(inArray(pushSubscription.id, delivered.slice(i, i + 500)));
    }
  }
  return { sent: delivered.length, removed: gone.length, failed };
}

export async function saveSubscription(keys: PushKeys) {
  await getDb()
    .insert(pushSubscription)
    .values(keys)
    .onConflictDoUpdate({ target: pushSubscription.endpoint, set: { p256dh: keys.p256dh, auth: keys.auth } });
}

export async function removeSubscription(endpoint: string) {
  await getDb().delete(pushSubscription).where(eq(pushSubscription.endpoint, endpoint));
}
