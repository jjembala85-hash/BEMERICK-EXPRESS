"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLog, user } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { findInvite } from "@/lib/invites";

export type WelcomeState = { error?: string };

/** The invited person sets their own password; the link is used up. */
export async function acceptInvite(_prev: WelcomeState, formData: FormData): Promise<WelcomeState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const invite = await findInvite(token);
  if (!invite) return { error: "This link has expired or was already used. Ask your administrator for a new one." };
  if (password.length < 12) return { error: "Use a password of at least 12 characters." };
  if (password.length > 128) return { error: "That password is too long." };
  if (password !== confirm) return { error: "The two passwords do not match." };

  try {
    await getAuth().api.resetPassword({ body: { newPassword: password, token } });
  } catch {
    return { error: "This link has expired or was already used. Ask your administrator for a new one." };
  }

  const db = getDb();
  // Opening the link proves they received it, so the email counts as verified.
  await db.update(user).set({ emailVerified: true }).where(eq(user.id, invite.userId));
  await db.insert(auditLog).values({
    actorId: invite.userId,
    action: "staff.set_password",
    entity: "user",
    entityId: invite.userId,
  });
  redirect("/newsroom/login?welcome=1");
}
