// Limits password guessing on the newsroom sign-in (D-042). Better Auth's own
// limiter only covers requests to /api/auth; our sign-in form calls it from a
// server action, so failed attempts are counted here, in the database (shared by
// every Vercel instance). Only salted one-way hashes are stored, for a day at most.
import { createHash } from "node:crypto";
import { and, count, eq, gt, inArray, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { formThrottle } from "@/db/schema";

export const LOGIN_WINDOW_MS = 15 * 60_000;
export const MAX_FAILS_PER_EMAIL = 10;
export const MAX_FAILS_PER_ADDRESS = 30;

/** Salted with the auth secret and the day, so hashes cannot be reversed or linked across days. */
export function loginKeys(email: string, ip: string, day = new Date().toISOString().slice(0, 10)) {
  const salt = `${process.env.BETTER_AUTH_SECRET ?? ""}|${day}`;
  const hash = (v: string) => createHash("sha256").update(`${salt}|${v}`).digest("hex");
  return { email: hash(`login-email|${email.trim().toLowerCase()}`), address: hash(`login-ip|${ip}`) };
}

/** True when this email or address has failed too often in the last 15 minutes. */
export async function loginBlocked(keys: { email: string; address: string }) {
  const since = new Date(Date.now() - LOGIN_WINDOW_MS);
  const rows = await getDb()
    .select({ key: formThrottle.keyHash, n: count() })
    .from(formThrottle)
    .where(and(inArray(formThrottle.keyHash, [keys.email, keys.address]), gt(formThrottle.createdAt, since)))
    .groupBy(formThrottle.keyHash);
  const of = (k: string) => rows.find((r) => r.key === k)?.n ?? 0;
  return of(keys.email) >= MAX_FAILS_PER_EMAIL || of(keys.address) >= MAX_FAILS_PER_ADDRESS;
}

export async function recordLoginFailure(keys: { email: string; address: string }) {
  const db = getDb();
  await db.batch([
    db.insert(formThrottle).values([{ keyHash: keys.email }, { keyHash: keys.address }]),
    db.delete(formThrottle).where(lt(formThrottle.createdAt, new Date(Date.now() - 24 * 3600_000))),
  ]);
}

/** A successful sign-in clears that email's failures (not the address's). */
export async function clearLoginFailures(keys: { email: string }) {
  await getDb().delete(formThrottle).where(eq(formThrottle.keyHash, keys.email));
}
