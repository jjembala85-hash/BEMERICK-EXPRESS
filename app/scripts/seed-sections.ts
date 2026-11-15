// Loads the launch sections into the database (safe to run repeatedly).
//   npm run db:seed
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { getDb } = await import("../src/db");
  const { section } = await import("../src/db/schema");
  const { sections } = await import("../src/lib/sections");

  const rows = sections.map((s, i) => ({
    slug: s.slug,
    name: s.name,
    description: s.description,
    sortOrder: (i + 1) * 10,
    showInNav: true,
  }));

  const inserted = await getDb()
    .insert(section)
    .values(rows)
    .onConflictDoNothing({ target: section.slug })
    .returning({ slug: section.slug });

  console.log(`Sections on ${process.env.NEON_BRANCH ?? "database"}: ${inserted.length} added, ${rows.length - inserted.length} already present.`);
}

main().catch((error) => {
  console.error("Seeding failed:", error?.message ?? error);
  process.exit(1);
});
