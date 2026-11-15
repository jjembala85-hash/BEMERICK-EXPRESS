// One-time setup: create an administrator account.
//   npm run create-admin
// Reads the database from .env.local (the Neon branch you are linked to).
import { config } from "dotenv";
config({ path: ".env.local" });

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { eq } from "drizzle-orm";

async function ask(question: string, hidden = false) {
  const rl = createInterface({ input: stdin, output: stdout, terminal: true });
  if (hidden) {
    // Do not echo the password as it is typed.
    const out = rl as unknown as { _writeToOutput: (s: string) => void };
    const original = out._writeToOutput.bind(rl);
    out._writeToOutput = (s: string) => {
      if (s.includes(question)) original(s);
    };
  }
  const answer = await rl.question(question);
  rl.close();
  if (hidden) stdout.write("\n");
  return answer.trim();
}

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function main() {
  const { createAuth } = await import("../src/lib/auth");
  const { getDb } = await import("../src/db");
  const { user, staffProfile } = await import("../src/db/schema");

  console.log(`\nCreate a BX Newsroom administrator (database branch: ${process.env.NEON_BRANCH ?? "unknown"})\n`);
  const name = process.env.BX_ADMIN_NAME ?? (await ask("Full name: "));
  const email = (process.env.BX_ADMIN_EMAIL ?? (await ask("Email: "))).toLowerCase();
  const password = process.env.BX_ADMIN_PASSWORD ?? (await ask("Password (12+ characters, hidden): ", true));

  if (!name || !email || password.length < 12) {
    throw new Error("Name and email are required, and the password needs at least 12 characters.");
  }

  const auth = createAuth({ allowSignUp: true });
  const result = await auth.api.signUpEmail({ body: { name, email, password } });

  const db = getDb();
  await db.update(user).set({ role: "admin", emailVerified: true }).where(eq(user.id, result.user.id));
  await db.insert(staffProfile).values({
    userId: result.user.id,
    displayName: name,
    slug: slugify(name),
    jobTitle: "Administrator",
  });

  console.log(`\nAdministrator created: ${email}\nSign in at /newsroom/login\n`);
}

main().catch((error) => {
  console.error("\nCould not create the administrator:", error?.message ?? error);
  process.exit(1);
});
