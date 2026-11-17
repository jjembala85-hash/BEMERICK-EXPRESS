import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getAuth } from "@/lib/auth";
import { can, isRole, type Permission, type Role } from "@/lib/permissions";
import { mustUseTwoFactor } from "@/lib/two-factor";

export type Staff = {
  id: string;
  name: string;
  email: string;
  role: Role;
  twoFactorEnabled: boolean;
  /** Admin or editor who has not set up two-step sign-in yet: may only reach the setup page. */
  needsTwoFactorSetup: boolean;
};

/** The signed-in staff member, or null. Always runs on the server. */
export async function getStaff(): Promise<Staff | null> {
  // Sessions are checked on real visits only, never during a prefetch or prerender
  // (those cut database calls off and log errors).
  await connection();
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return null;
  const { user } = session;
  if (user.banned || !isRole(user.role)) return null;
  const twoFactorEnabled = Boolean((user as { twoFactorEnabled?: boolean | null }).twoFactorEnabled);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    twoFactorEnabled,
    needsTwoFactorSetup: mustUseTwoFactor(user.role) && !twoFactorEnabled,
  };
}

/**
 * Use at the top of every newsroom page and server action.
 * Admins and editors without two-step sign-in are sent to set it up first;
 * only the setup page itself passes `allowWithoutTwoFactor`.
 */
export async function requireStaff(
  permission?: Permission,
  options: { allowWithoutTwoFactor?: boolean } = {},
): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) redirect("/newsroom/login");
  if (staff.needsTwoFactorSetup && !options.allowWithoutTwoFactor) redirect("/newsroom/security?required=1");
  if (permission && !can(staff.role, permission)) redirect("/newsroom?denied=1");
  return staff;
}
