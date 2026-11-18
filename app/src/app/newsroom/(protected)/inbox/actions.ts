"use server";

import { refresh } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLog, readerMessage } from "@/db/schema";
import { requireStaff } from "@/lib/session";

export type InboxState = { error?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function setMessageStatus(_prev: InboxState, formData: FormData): Promise<InboxState> {
  const staff = await requireStaff("inbox.read");
  const id = String(formData.get("messageId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!UUID.test(id) || !["new", "read", "archived"].includes(status)) return { error: "Unknown message." };
  await getDb()
    .update(readerMessage)
    .set({ status: status as "new" | "read" | "archived", handledBy: staff.id })
    .where(eq(readerMessage.id, id));
  refresh();
  return {};
}

/** Deleting is permanent: the right thing once a message is dealt with (keep the minimum). */
export async function deleteMessage(_prev: InboxState, formData: FormData): Promise<InboxState> {
  const staff = await requireStaff("inbox.read");
  const id = String(formData.get("messageId") ?? "");
  if (!UUID.test(id)) return { error: "Unknown message." };
  const db = getDb();
  const [row] = await db.select({ kind: readerMessage.kind }).from(readerMessage).where(eq(readerMessage.id, id)).limit(1);
  if (!row) return {};
  await db.batch([
    db.delete(readerMessage).where(eq(readerMessage.id, id)),
    // The message itself is not copied into the log, only that one was deleted.
    db.insert(auditLog).values({ actorId: staff.id, action: "inbox.delete", entity: "reader_message", entityId: id, details: { kind: row.kind } }),
  ]);
  refresh();
  return {};
}
