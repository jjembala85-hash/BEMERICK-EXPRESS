import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getAuth } from "@/lib/auth";
import { can, isRole, type Permission, type Role } from "@/lib/permissions";

export type Staff = { id: string; name: string; email: string; role: Role };

/** The signed-in staff member, or null. Always runs on the server. */
export async function getStaff(): Promise<Staff | null> {
  // Sessions are checked on real visits only, never during a prefetch or prerender
  // (those cut database calls off and log errors).
  await connection();
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return null;
  const { user } = session;
  if (user.banned || !isRole(user.role)) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

/** Use at the top of every newsroom page and server action. */
export async function requireStaff(permission?: Permission): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) redirect("/newsroom/login");
  if (permission && !can(staff.role, permission)) redirect("/newsroom?denied=1");
  return staff;
}
