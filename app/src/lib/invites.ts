// Staff invitations without an email service ($0).
// An invite is a Better Auth password-reset token that lasts 7 days. The admin
// shares the link (WhatsApp or copy); the new person opens it and sets their
// own password, so nobody else ever knows it. Using the link once uses it up.
import { and, eq, gt, like } from "drizzle-orm";
import { getDb } from "@/db";
import { verification } from "@/db/schema";
import { getAuth } from "@/lib/auth";

export const INVITE_DAYS = 7;
const PREFIX = "reset-password:";

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function siteUrl() {
  return (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

/** Cancels any earlier link for this person and makes a new one. */
export async function createInviteLink(userId: string) {
  await getDb()
    .delete(verification)
    .where(and(eq(verification.value, userId), like(verification.identifier, `${PREFIX}%`)));

  const token = randomToken();
  const ctx = await getAuth().$context;
  await ctx.internalAdapter.createVerificationValue({
    identifier: `${PREFIX}${token}`,
    value: userId,
    expiresAt: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000),
  });
  return `${siteUrl()}/newsroom/welcome?token=${token}`;
}

/** The person an invite link belongs to, or null if it is unknown, used or expired. */
export async function findInvite(token: string) {
  if (!/^[0-9a-f]{48}$/.test(token)) return null;
  const ctx = await getAuth().$context;
  const found = await ctx.internalAdapter.findVerificationValue(`${PREFIX}${token}`);
  if (!found || found.expiresAt < new Date()) return null;
  const person = await ctx.internalAdapter.findUserById(found.value);
  return person ? { userId: person.id, name: person.name, email: person.email } : null;
}

/** Ids of people whose invite has not been used yet (and has not expired). */
export async function pendingInviteUserIds() {
  const rows = await getDb()
    .select({ userId: verification.value })
    .from(verification)
    .where(and(like(verification.identifier, `${PREFIX}%`), gt(verification.expiresAt, new Date())));
  return new Set(rows.map((r) => r.userId));
}
