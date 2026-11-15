import { count } from "drizzle-orm";
import { getDb } from "@/db";
import { user } from "@/db/schema";

/** True only while the newsroom has no accounts at all (first-run setup). */
export async function needsSetup() {
  const [row] = await getDb().select({ n: count() }).from(user);
  return (row?.n ?? 0) === 0;
}

/**
 * On the live site, first-run setup also needs the BX_SETUP_KEY secret so a
 * stranger cannot claim the admin account. Locally no key is needed.
 */
export function setupKeyRequired() {
  return process.env.NODE_ENV === "production";
}
