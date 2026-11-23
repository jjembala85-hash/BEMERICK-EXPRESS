"use server";

import { after } from "next/server";
import { and, count, eq, gt } from "drizzle-orm";
import { getDb } from "@/db";
import { newsletterSubscriber } from "@/db/schema";
import { checkToken, confirmEmail, mailConfigured, normaliseEmail, sendEmails } from "@/lib/newsletter";
import { MIN_FILL_MS } from "@/lib/reader-forms";
import { readerSignupsEnabled } from "@/lib/site";
import { withinHourlyLimit } from "@/lib/throttle";
import { pruneUnconfirmed, unsubscribeNow } from "@/lib/newsletter-db";

export type SignupState = { error?: string; sent?: boolean };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RESEND_WAIT_MS = 15 * 60_000;
/** Confirmation emails per day, so sign-up abuse cannot use up the day's email allowance. */
const MAX_CONFIRMATIONS_PER_DAY = 40;

/**
 * Sign-up, step 1: we email a confirmation link (double opt-in). The answer and
 * the time it takes are the same whether or not the address is already known
 * (the work happens after the reply), so the form never reveals who reads BX News.
 */
export async function subscribe(_prev: SignupState, formData: FormData): Promise<SignupState> {
  if (!readerSignupsEnabled() || !mailConfigured()) return { error: "The newsletter is not open for sign-ups yet." };
  if (formData.get("website")) return { error: "Your sign-up could not be sent." };
  const started = Number(formData.get("startedAt"));
  if (!Number.isFinite(started) || Date.now() - started < MIN_FILL_MS) return { error: "Your sign-up could not be sent. Wait a moment and try again." };
  const email = normaliseEmail(String(formData.get("email") ?? ""));
  if (!email) return { error: "Enter a valid email address." };
  // Generous per network: many readers share one mobile-network address. The real
  // limits are per email address and per day, below.
  if (!(await withinHourlyLimit("newsletter", 30))) return { error: "Too many sign-ups from this network. Try again in an hour." };

  after(async () => {
    try {
      const db = getDb();
      await pruneUnconfirmed();
      const [existing] = await db.select().from(newsletterSubscriber).where(eq(newsletterSubscriber.email, email)).limit(1);
      if (existing?.status === "confirmed") return;
      // One confirmation per address every 15 minutes: nobody's inbox can be flooded.
      if (existing?.lastConfirmSentAt && Date.now() - existing.lastConfirmSentAt.getTime() < RESEND_WAIT_MS) return;
      const [{ n }] = await db
        .select({ n: count() })
        .from(newsletterSubscriber)
        .where(gt(newsletterSubscriber.lastConfirmSentAt, new Date(Date.now() - 86400_000)));
      if (n >= MAX_CONFIRMATIONS_PER_DAY) return;

      const now = new Date();
      let id = existing?.id;
      if (!existing) {
        [{ id }] = await db.insert(newsletterSubscriber).values({ email, lastConfirmSentAt: now }).returning({ id: newsletterSubscriber.id });
      } else {
        await db
          .update(newsletterSubscriber)
          .set({ status: "pending", lastConfirmSentAt: now, unsubscribedAt: null, ...(existing.status === "unsubscribed" ? { createdAt: now } : {}) })
          .where(eq(newsletterSubscriber.id, existing.id));
      }
      await sendEmails([{ ...confirmEmail(id!), to: email }]);
    } catch {
      // The reader can simply sign up again; nothing to show after the reply.
    }
  });
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

export async function unsubscribe(_prev: LinkState, formData: FormData): Promise<LinkState> {
  const ok = await unsubscribeNow(String(formData.get("id") ?? ""), String(formData.get("t") ?? ""));
  return ok ? { done: true } : { error: "This link is not valid. Use the Unsubscribe link in your latest email." };
}
