// Newsletter database helpers shared by reader pages, the one-click unsubscribe
// route and the newsroom. Kept out of "use server" files, whose exports are public endpoints.
import { and, eq, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { newsletterSubscriber } from "@/db/schema";
import { checkToken } from "@/lib/newsletter";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Unconfirmed sign-ups are removed after 7 days (run on sign-ups and whenever the newsroom page opens). */
export async function pruneUnconfirmed() {
  await getDb()
    .delete(newsletterSubscriber)
    .where(and(eq(newsletterSubscriber.status, "pending"), lt(newsletterSubscriber.createdAt, new Date(Date.now() - 7 * 86400_000))));
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
