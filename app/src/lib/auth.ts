import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/db";
import * as schema from "@/db/schema";

/**
 * Staff authentication. There is no public sign-up: the first admin is made
 * with `npm run create-admin`, everyone else is invited by an admin.
 */
export function createAuth(options: { allowSignUp?: boolean } = {}) {
  return betterAuth({
    database: drizzleAdapter(getDb(), { provider: "pg", schema }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: !options.allowSignUp,
      minPasswordLength: 12,
    },
    plugins: [
      admin({ defaultRole: "writer", adminRoles: ["admin"] }),
      nextCookies(), // must stay last
    ],
  });
}

let cached: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  return (cached ??= createAuth());
}
