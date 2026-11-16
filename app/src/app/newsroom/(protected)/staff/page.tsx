import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { staffProfile, user } from "@/db/schema";
import { requireStaff } from "@/lib/session";
import { isRole, roleLabels } from "@/lib/permissions";
import { pendingInviteUserIds } from "@/lib/invites";
import { InviteForm, StaffRowControls } from "@/components/newsroom/staff-controls";

export const metadata: Metadata = { title: "Staff" };

export default async function StaffPage() {
  const me = await requireStaff("staff.manage");
  const [people, pending] = await Promise.all([
    getDb()
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        banned: user.banned,
        jobTitle: staffProfile.jobTitle,
      })
      .from(user)
      .leftJoin(staffProfile, eq(staffProfile.userId, user.id))
      .orderBy(asc(user.name)),
    pendingInviteUserIds(),
  ]);

  return (
    <>
      <h1 className="font-serif text-3xl font-bold text-ink">Staff</h1>
      <p className="mt-1 text-slate">
        Add people and choose what they can do. Writers write and submit; editors review and publish; admins also manage
        staff.
      </p>

      <section className="mt-8 rounded-lg border border-mist bg-surface p-5">
        <h2 className="mb-4 font-serif text-xl font-bold text-ink">Add a person</h2>
        <InviteForm />
      </section>

      <section className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">
          Newsroom accounts <span className="text-ink">({people.length})</span>
        </h2>
        <ul className="mt-3 divide-y divide-mist rounded-lg border border-mist bg-surface">
          {people.map((p) => {
            const role = isRole(p.role) ? p.role : null;
            const state = p.banned ? "Deactivated" : pending.has(p.id) ? "Invite not used yet" : "Active";
            return (
              <li key={p.id} className="px-4 py-4">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-semibold text-ink">{p.name}</span>
                  <span className="text-sm text-slate">{p.email}</span>
                  {p.jobTitle && <span className="text-sm text-slate">· {p.jobTitle}</span>}
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold ${
                      p.banned ? "bg-ember/10 text-ember" : state === "Active" ? "bg-lake-ink/15 text-lake-ink" : "bg-crane-gold/20 text-ink"
                    }`}
                  >
                    {state}
                  </span>
                </div>
                {p.id === me.id ? (
                  <p className="mt-1 text-sm text-slate">{role ? roleLabels[role] : p.role} · this is you</p>
                ) : role ? (
                  <StaffRowControls userId={p.id} name={p.name} role={role} active={!p.banned} />
                ) : (
                  <p className="mt-1 text-sm text-ember">Unknown role “{p.role}”. Contact the developer.</p>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
