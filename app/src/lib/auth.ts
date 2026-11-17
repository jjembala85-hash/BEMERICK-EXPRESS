import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, twoFactor } from "better-auth/plugins";
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
      // Authenticator-app codes (D-033). No SMS/email codes: they cost money and are weaker.
      twoFactor({
        issuer: "BX Newsroom",
        // "Trust this device" on a person's own phone or laptop lasts 30 days.
        trustDeviceMaxAge: 30 * 24 * 60 * 60,
        backupCodeOptions: { amount: 10, length: 10 },
      }),
      nextCookies(), // must stay last
    ],
  });
}

let cached: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  return (cached ??= createAuth());
}
