"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLog, newsletterIssue } from "@/db/schema";
import { requireStaff } from "@/lib/session";
import { formatEAT } from "@/lib/dates";
import { issueEmail, mailConfigured, oneClickUrl, sendEmails } from "@/lib/newsletter";
import { confirmedSubscribers, issueStories, storyChoices } from "@/lib/queries/newsletter";

export type IssueState = { error?: string; message?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_STORIES = 10;

/** Starts an edition filled with the newest stories of the last day. */
export async function newIssue() {
  const staff = await requireStaff("audience.manage");
  const recent = (await storyChoices([], 1)).slice(0, 6);
  const [{ id }] = await getDb()
    .insert(newsletterIssue)
    .values({
      subject: `BX News morning briefing · ${formatEAT(new Date()).split(",")[0]}`,
      articleIds: recent.map((s) => s.id),
      createdBy: staff.id,
    })
    .returning({ id: newsletterIssue.id });
  redirect(`/newsroom/newsletter/${id}`);
}

export async function saveIssue(_prev: IssueState, formData: FormData): Promise<IssueState> {
  await requireStaff("audience.manage");
  const id = String(formData.get("issueId") ?? "");
  const subject = String(formData.get("subject") ?? "").trim();
  const intro = String(formData.get("intro") ?? "").trim().replace(/\r\n/g, "\n");
  const articleIds = [...new Set(formData.getAll("articleIds").map(String))].filter((v) => UUID.test(v));
  if (!UUID.test(id)) return { error: "This edition no longer exists." };
  if (subject.length < 5 || subject.length > 120) return { error: "Write a subject line (5 to 120 characters)." };
  if (intro.length > 1000) return { error: "Keep the introduction under 1,000 characters." };
  if (articleIds.length === 0) return { error: "Choose at least one story." };
  if (articleIds.length > MAX_STORIES) return { error: `Choose at most ${MAX_STORIES} stories: short briefings get read.` };
  const updated = await getDb()
    .update(newsletterIssue)
    .set({ subject, intro: intro || null, articleIds, updatedAt: new Date() })
    .where(and(eq(newsletterIssue.id, id), isNull(newsletterIssue.sentAt)))
    .returning({ id: newsletterIssue.id });
  if (updated.length === 0) return { error: "This edition has already been sent and can no longer be changed." };
  refresh();
  return { message: "Saved. The preview below is up to date." };
}

async function loadIssue(id: string) {
  const [issue] = UUID.test(id) ? await getDb().select().from(newsletterIssue).where(eq(newsletterIssue.id, id)).limit(1) : [];
  if (!issue) return null;
  return { issue, stories: await issueStories(issue.articleIds) };
}

/** Sends the saved edition to the signed-in staff member only. */
export async function sendTest(_prev: IssueState, formData: FormData): Promise<IssueState> {
  const staff = await requireStaff("audience.manage");
  if (!mailConfigured()) return { error: "Email sending is not set up yet." };
  const loaded = await loadIssue(String(formData.get("issueId") ?? ""));
  if (!loaded) return { error: "This edition no longer exists." };
  if (loaded.stories.length === 0) return { error: "Choose stories and save first." };
  const email = issueEmail({ subject: loaded.issue.subject, intro: loaded.issue.intro, stories: loaded.stories }, null);
  try {
    await sendEmails([{ ...email, subject: `[Test] ${email.subject}`, to: staff.email }]);
  } catch (e) {
    return { error: `The test could not be sent: ${e instanceof Error ? e.message : "unknown error"}` };
  }
  return { message: `Test sent to ${staff.email}.` };
}

/** Sends the edition to every confirmed subscriber, once. */
export async function sendIssue(_prev: IssueState, formData: FormData): Promise<IssueState> {
  const staff = await requireStaff("audience.manage");
  if (!mailConfigured()) return { error: "Email sending is not set up yet." };
  const id = String(formData.get("issueId") ?? "");
  const loaded = await loadIssue(id);
  if (!loaded) return { error: "This edition no longer exists." };
  if (loaded.stories.length === 0) return { error: "Choose stories and save first." };
  const subscribers = await confirmedSubscribers();
  if (subscribers.length === 0) return { error: "There are no confirmed subscribers yet." };

  // Claim the edition first, so a double click or a second editor cannot send it twice.
  const db = getDb();
  const claimed = await db
    .update(newsletterIssue)
    .set({ sentAt: new Date() })
    .where(and(eq(newsletterIssue.id, id), isNull(newsletterIssue.sentAt)))
    .returning({ id: newsletterIssue.id });
  if (claimed.length === 0) return { error: "This edition has already been sent." };

  const base = { subject: loaded.issue.subject, intro: loaded.issue.intro, stories: loaded.stories };
  let accepted = 0;
  let problem: string | null = null;
  try {
    accepted = await sendEmails(subscribers.map((s) => ({ ...issueEmail(base, s.id), to: s.email, unsubscribe: oneClickUrl(s.id) })));
  } catch (e) {
    accepted = (e as { accepted?: number }).accepted ?? 0;
    problem = e instanceof Error ? e.message : "unknown error";
  }
  await db.batch([
    db.update(newsletterIssue).set({ sentCount: accepted, updatedAt: new Date() }).where(eq(newsletterIssue.id, id)),
    db.insert(auditLog).values({
      actorId: staff.id,
      action: "newsletter.send",
      entity: "newsletter_issue",
      entityId: id,
      details: { subject: loaded.issue.subject, sent: accepted, of: subscribers.length, ...(problem ? { problem } : {}) },
    }),
  ]);
  refresh();
  if (problem) return { error: `Sent to ${accepted} of ${subscribers.length}, then the email service stopped: ${problem}` };
  return { message: `Sent to ${accepted.toLocaleString("en-GB")} subscriber${accepted === 1 ? "" : "s"}.` };
}

export async function deleteIssue(formData: FormData) {
  await requireStaff("audience.manage");
  const id = String(formData.get("issueId") ?? "");
  if (UUID.test(id)) await getDb().delete(newsletterIssue).where(and(eq(newsletterIssue.id, id), isNull(newsletterIssue.sentAt)));
  redirect("/newsroom/newsletter");
}
