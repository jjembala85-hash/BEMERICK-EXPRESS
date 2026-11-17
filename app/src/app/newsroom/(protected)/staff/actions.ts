"use server";

import { headers } from "next/headers";
import { refresh } from "next/cache";
import { and, eq, like } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLog, session, staffProfile, twoFactor, user, verification } from "@/db/schema";
import { getAuth } from "@/lib/auth";
import { requireStaff } from "@/lib/session";
import { isRole, roleLabels } from "@/lib/permissions";
import { slugify } from "@/lib/slug";
import { createInviteLink } from "@/lib/invites";

export type InviteState = { error?: string; link?: string; name?: string };
export type StaffActionState = { error?: string; link?: string; name?: string; message?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function uniqueStaffSlug(name: string) {
  const base = slugify(name) || "staff";
  const taken = new Set(
    (
      await getDb()
        .select({ slug: staffProfile.slug })
        .from(staffProfile)
        .where(like(staffProfile.slug, `${base}%`))
    ).map((r) => r.slug),
  );
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

/** Admin adds a person and gets a one-time link for them to set their password. */
export async function inviteStaff(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const admin = await requireStaff("staff.manage");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const roleInput = String(formData.get("role") ?? "writer");
  const jobTitle = String(formData.get("jobTitle") ?? "").trim();

  if (name.length < 2 || name.length > 80) return { error: "Enter the person's full name." };
  if (!EMAIL.test(email) || email.length > 200) return { error: "Enter a valid email address." };
  if (!isRole(roleInput)) return { error: "Choose a role." };
  if (jobTitle.length > 80) return { error: "The job title is too long." };

  const db = getDb();
  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
  if (existing) return { error: "Someone with that email already has an account. Use 'New link' on their row instead." };

  let userId: string;
  try {
    // A random password nobody knows; the person sets their own from the invite link.
    const placeholder = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16)).join("");
    const created = await getAuth().api.createUser({
      body: { email, name, password: placeholder },
      headers: await headers(),
    });
    userId = created.user.id;
    // Roles live in our user table (lib/permissions); Better Auth's types only know admin/user.
    await getDb().update(user).set({ role: roleInput }).where(eq(user.id, userId));
  } catch (error) {
    console.error("Invite failed", error);
    return { error: "The account could not be created. Try again." };
  }

  await db.insert(staffProfile).values({
    userId,
    displayName: name,
    slug: await uniqueStaffSlug(name),
    jobTitle: jobTitle || roleLabels[roleInput],
  });
  const link = await createInviteLink(userId);
  await db.insert(auditLog).values({
    actorId: admin.id,
    action: "staff.invite",
    entity: "user",
    entityId: userId,
    details: { email, role: roleInput },
  });
  refresh();
  return { link, name };
}

async function target(formData: FormData) {
  const admin = await requireStaff("staff.manage");
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { admin, error: "Unknown person." } as const;
  if (userId === admin.id) return { admin, error: "You can't change your own account here." } as const;
  const [person] = await getDb()
    .select({ id: user.id, name: user.name, role: user.role, banned: user.banned })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!person) return { admin, error: "That person no longer exists." } as const;
  return { admin, person } as const;
}

/** A fresh invite / password link (the old one stops working). */
export async function newStaffLink(_prev: StaffActionState, formData: FormData): Promise<StaffActionState> {
  const t = await target(formData);
  if ("error" in t) return { error: t.error };
  const link = await createInviteLink(t.person.id);
  await getDb().insert(auditLog).values({
    actorId: t.admin.id,
    action: "staff.new_link",
    entity: "user",
    entityId: t.person.id,
  });
  refresh();
  return { link, name: t.person.name };
}

export async function changeStaffRole(_prev: StaffActionState, formData: FormData): Promise<StaffActionState> {
  const t = await target(formData);
  if ("error" in t) return { error: t.error };
  const role = String(formData.get("role") ?? "");
  if (!isRole(role)) return { error: "Choose a role." };
  if (role === t.person.role) return {};
  await getDb().update(user).set({ role }).where(eq(user.id, t.person.id));
  await getDb().insert(auditLog).values({
    actorId: t.admin.id,
    action: "staff.change_role",
    entity: "user",
    entityId: t.person.id,
    details: { from: t.person.role, to: role },
  });
  refresh();
  return {};
}

/** Deactivating signs the person out everywhere and blocks sign-in; their stories stay. */
export async function setStaffActive(_prev: StaffActionState, formData: FormData): Promise<StaffActionState> {
  const t = await target(formData);
  if ("error" in t) return { error: t.error };
  const active = formData.get("active") === "true";
  const h = await headers();
  if (active) await getAuth().api.unbanUser({ body: { userId: t.person.id }, headers: h });
  else await getAuth().api.banUser({ body: { userId: t.person.id, banReason: "Deactivated by an administrator" }, headers: h });
  await getDb().insert(auditLog).values({
    actorId: t.admin.id,
    action: active ? "staff.reactivate" : "staff.deactivate",
    entity: "user",
    entityId: t.person.id,
  });
  refresh();
  return {};
}

/**
 * For someone who lost their phone and backup codes: removes their authenticator
 * set-up and signs them out everywhere. Admins and editors must set it up again
 * at their next sign-in.
 */
export async function resetTwoFactor(_prev: StaffActionState, formData: FormData): Promise<StaffActionState> {
  const t = await target(formData);
  if ("error" in t) return { error: t.error };
  const db = getDb();
  await db.batch([
    db.delete(twoFactor).where(eq(twoFactor.userId, t.person.id)),
    db.update(user).set({ twoFactorEnabled: false }).where(eq(user.id, t.person.id)),
    db.delete(session).where(eq(session.userId, t.person.id)),
    // "Trust this device" records, so no old device can skip the new set-up.
    db.delete(verification).where(and(eq(verification.value, t.person.id), like(verification.identifier, "trust-device-%"))),
    db.insert(auditLog).values({
      actorId: t.admin.id,
      action: "staff.reset_two_factor",
      entity: "user",
      entityId: t.person.id,
    }),
  ]);
  refresh();
  return { message: "Two-step sign-in reset. They have been signed out and will set it up again when they next sign in." };
}
