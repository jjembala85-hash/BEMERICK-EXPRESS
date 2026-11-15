"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { createAuth } from "@/lib/auth";
import { getDb } from "@/db";
import { auditLog, staffProfile, user } from "@/db/schema";
import { needsSetup, setupKeyRequired } from "@/lib/setup";

export type SetupState = { error?: string };

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createFirstAdmin(_prev: SetupState, formData: FormData): Promise<SetupState> {
  // Re-checked on the server every time: this only works with zero accounts.
  if (!(await needsSetup())) redirect("/newsroom/login");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const key = String(formData.get("setupKey") ?? "");

  if (setupKeyRequired()) {
    const expected = process.env.BX_SETUP_KEY;
    if (!expected || key !== expected) return { error: "The setup key is not correct." };
  }
  if (!name || !email) return { error: "Enter your full name and email." };
  if (password.length < 12) return { error: "Use a password of at least 12 characters." };
  if (password !== confirm) return { error: "The two passwords do not match." };

  let userId: string;
  try {
    const result = await createAuth({ allowSignUp: true }).api.signUpEmail({
      body: { name, email, password },
      headers: await headers(),
    });
    userId = result.user.id;
  } catch {
    return { error: "Could not create the account. Check the email address and try again." };
  }

  const db = getDb();
  await db.update(user).set({ role: "admin", emailVerified: true }).where(eq(user.id, userId));
  await db.insert(staffProfile).values({
    userId,
    displayName: name,
    slug: slugify(name) || "admin",
    jobTitle: "Administrator",
  });
  await db.insert(auditLog).values({
    actorId: userId,
    action: "setup.first_admin",
    entity: "user",
    entityId: userId,
  });

  redirect("/newsroom");
}
