import { lt } from "drizzle-orm";
import { getDb } from "@/db";
import { readerMessage } from "@/db/schema";

/** Privacy policy: reader messages are never kept longer than 12 months. */
export const MESSAGE_RETENTION_DAYS = 365;

export async function pruneOldMessages() {
  await getDb()
    .delete(readerMessage)
    .where(lt(readerMessage.createdAt, new Date(Date.now() - MESSAGE_RETENTION_DAYS * 24 * 3600_000)));
}
