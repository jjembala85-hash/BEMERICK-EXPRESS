import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";

// Used only by the Better Auth CLI to generate src/db/auth-schema.ts.
export const auth = betterAuth({
  database: drizzleAdapter({}, { provider: "pg" }),
  emailAndPassword: { enabled: true },
  plugins: [admin({ defaultRole: "writer", adminRoles: ["admin"] })],
});
