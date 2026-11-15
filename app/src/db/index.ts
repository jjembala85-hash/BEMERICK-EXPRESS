import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return drizzle({ client: neon(url), schema });
}

let cached: ReturnType<typeof createDb> | undefined;

/** Server-only database handle. Never import this from a client component. */
export function getDb() {
  return (cached ??= createDb());
}
