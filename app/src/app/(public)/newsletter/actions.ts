"use server";

import { and, eq, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { newsletterSubscriber } from "@/db/schema";
import { checkToken, confirmEmail, mailConfigured, normaliseEmail, sendEmails } from "@/lib/newsletter";
import { MIN_FILL_MS } from "@/lib/reader-forms";
import { readerSignupsEnabled } from "@/lib/site";
import { withinHourlyLimit } from "@/lib/throttle";

export type SignupState = { error?: string; sent?: boolean };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Sign-up, step 1: we email a confirmation link (double opt-in). The answer is
 * the same whether or not the address is already subscribed, so the form never
 * reveals who reads BX News.
 */
export async function subscribe(_prev: SignupState, formData: FormData): Promise<SignupState> {
  if (!readerSignupsEnabled() || !mailConfigured()) return { error: "The newsletter is not open for sign-ups yet." };
  if (formData.get("website")) return { error: "Your sign-up could not be sent." };
  const started = Number(formData.get("startedAt"));
  if (!Number.isFinite(started) || Date.now() - started < MIN_FILL_MS) return { error: "Your sign-up could not be sent. Wait a moment and try again." };
  const email = normaliseEmail(String(formData.get("email") ?? ""));
  if (!email) return { error: "Enter a valid email address." };
  if (!(await withinHourlyLimit("newsletter", 5))) return { error: "Too many sign-ups from this network. Try again in an hour." };

  const db = getDb();
  // Unconfirmed sign-ups are removed after 7 days.
  await db
    .delete(newsletterSubscriber)
    .where(and(eq(newsletterSubscriber.status, "pending"), lt(newsletterSubscriber.createdAt, new Date(Date.now() - 7 * 86400_000))));

  const [existing] = await db.select().from(newsletterSubscriber).where(eq(newsletterSubscriber.email, email)).limit(1);
  if (existing?.status === "confirmed") return { sent: true };

  let id = existing?.id;
  if (!existing) {
    [{ id }] = await db.insert(newsletterSubscriber).values({ email }).returning({ id: newsletterSubscriber.id });
  } else if (existing.status === "unsubscribed") {
    await db.update(newsletterSubscriber).set({ status: "pending", createdAt: new Date(), unsubscribedAt: null }).where(eq(newsletterSubscriber.id, existing.id));
  }
  try {
    await sendEmails([{ ...confirmEmail(id!), to: email }]);
  } catch {
    return { error: "We could not send the confirmation email just now. Please try again later." };
  }
  return { sent: true };
}

export type LinkState = { error?: string; done?: boolean };

/** Sign-up, step 2: the reader taps "Confirm" on the page their email link opened. */
export async function confirmSubscription(_prev: LinkState, formData: FormData): Promise<LinkState> {
  const id = String(formData.get("id") ?? "");
  const token = String(formData.get("t") ?? "");
  if (!UUID.test(id) || !checkToken("confirm", id, token)) return { error: "This link is not valid. Sign up again to get a new one." };
  const updated = await getDb()
    .update(newsletterSubscriber)
    .set({ status: "confirmed", confirmedAt: new Date() })
    .where(and(eq(newsletterSubscriber.id, id), eq(newsletterSubscriber.status, "pending")))
    .returning({ id: newsletterSubscriber.id });
  if (updated.length === 0) {
    const [row] = await getDb().select({ status: newsletterSubscriber.status }).from(newsletterSubscriber).where(eq(newsletterSubscriber.id, id)).limit(1);
    if (row?.status === "confirmed") return { done: true };
    return { error: "This link has expired. Sign up again to get a new one." };
  }
  return { done: true };
}

/** Unsubscribing keeps nothing but the fact that this address said no (so we never email it by mistake). */
export async function unsubscribeNow(id: string, token: string) {
  if (!UUID.test(id) || !checkToken("unsubscribe", id, token)) return false;
  await getDb()
    .update(newsletterSubscriber)
    .set({ status: "unsubscribed", unsubscribedAt: new Date() })
    .where(eq(newsletterSubscriber.id, id));
  return true;
}

export async function unsubscribe(_prev: LinkState, formData: FormData): Promise<LinkState> {
  const ok = await unsubscribeNow(String(formData.get("id") ?? ""), String(formData.get("t") ?? ""));
  return ok ? { done: true } : { error: "This link is not valid. Use the Unsubscribe link in your latest email." };
}
