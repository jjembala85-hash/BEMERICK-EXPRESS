// Story review workflow (docs/03-technical-architecture.md section 6).
// The single source of truth for which buttons a person sees AND what the
// server allows: the editor page and the server action both call this.
import { can, type Role } from "./permissions";

export const STATUSES = [
  "draft",
  "in_review",
  "changes_requested",
  "approved",
  "scheduled",
  "published",
  "unpublished",
  "spiked",
] as const;
export type Status = (typeof STATUSES)[number];

export type WorkflowAction =
  | "submit" // writer sends the story to an editor
  | "approve" // editor clears it, to publish or schedule later
  | "approve_publish" // editor clears it and publishes in one step
  | "request_changes" // editor sends it back with a note
  | "spike" // editor kills it before publishing
  | "restore" // editor brings a spiked or unpublished story back to draft
  | "publish" // approved -> live; or admin fast-track from draft
  | "schedule" // approved -> goes live automatically at a set time
  | "unschedule" // scheduled -> approved
  | "unpublish"; // live -> taken down, reason required

export type StoryContext = {
  role: Role;
  isOwner: boolean;
  status: Status;
  legalHold: boolean;
};

/** Actions that need a written note (the reason is stored and shown to the writer). */
export const NOTE_REQUIRED: ReadonlySet<WorkflowAction> = new Set(["request_changes", "spike", "unpublish"]);

/** Actions that put a story in front of readers, now or later. */
export const GOES_PUBLIC: ReadonlySet<WorkflowAction> = new Set(["publish", "approve_publish", "schedule"]);

const BEFORE_REVIEW: readonly Status[] = ["draft", "changes_requested"];

export function isStatus(value: unknown): value is Status {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value);
}

/** Can this person change the story's words, headline, photo and section in its current state? */
export function canEditContent({ role, isOwner, status }: StoryContext) {
  if (can(role, "article.edit_any")) return status !== "spiked";
  // Writers edit their own story only while it is with them, not while an editor has it.
  return isOwner && BEFORE_REVIEW.includes(status);
}

/** Every workflow action this person may take on the story right now, in button order. */
export function availableActions(ctx: StoryContext): WorkflowAction[] {
  const { role, isOwner, status, legalHold } = ctx;
  const review = can(role, "article.review");
  const publish = can(role, "article.publish") && !legalHold;
  const fastTrack = can(role, "article.fast_track") && !legalHold;
  const actions: WorkflowAction[] = [];

  if (BEFORE_REVIEW.includes(status) && (isOwner || can(role, "article.edit_any"))) actions.push("submit");
  if (BEFORE_REVIEW.includes(status) && fastTrack) actions.push("publish", "schedule");

  if (status === "in_review" && review) {
    if (publish) actions.push("approve_publish");
    actions.push("approve", "request_changes", "spike");
  }
  if (status === "approved" && publish) actions.push("publish", "schedule");
  if (status === "scheduled" && publish) actions.push("unschedule");
  if (status === "published" && can(role, "article.unpublish")) actions.push("unpublish");
  if (status === "unpublished" && publish) actions.push("publish");
  if ((status === "spiked" || status === "unpublished") && review) actions.push("restore");

  return actions;
}

export function canTake(ctx: StoryContext, action: WorkflowAction) {
  return availableActions(ctx).includes(action);
}

/** The status a story moves to after the action. */
export function nextStatus(action: WorkflowAction): Status {
  switch (action) {
    case "submit":
      return "in_review";
    case "approve":
    case "unschedule":
      return "approved";
    case "approve_publish":
    case "publish":
      return "published";
    case "request_changes":
      return "changes_requested";
    case "spike":
      return "spiked";
    case "restore":
      return "draft";
    case "schedule":
      return "scheduled";
    case "unpublish":
      return "unpublished";
  }
}

export const statusLabels: Record<Status, string> = {
  draft: "Draft",
  in_review: "In review",
  changes_requested: "Changes requested",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
  unpublished: "Unpublished",
  spiked: "Spiked",
};

export const actionLabels: Record<WorkflowAction, string> = {
  submit: "Submit for review",
  approve: "Approve",
  approve_publish: "Approve and publish",
  request_changes: "Send back with notes",
  spike: "Spike story",
  restore: "Restore to draft",
  publish: "Publish now",
  schedule: "Schedule",
  unschedule: "Cancel schedule",
  unpublish: "Unpublish",
};

/** What the person sees after the action succeeds. */
export const actionMessages: Record<WorkflowAction, string> = {
  submit: "Submitted. An editor will review it.",
  approve: "Approved. Publish it now or schedule it.",
  approve_publish: "Approved and published. The story is live.",
  request_changes: "Sent back to the writer with your notes.",
  spike: "Spiked. The story will not be published.",
  restore: "Restored to draft.",
  publish: "Published. The story is live.",
  schedule: "Scheduled. It will go live at the set time.",
  unschedule: "Schedule cancelled. The story is approved and waiting.",
  unpublish: "Unpublished. The story is no longer visible to readers.",
};

/**
 * Reads a schedule time typed in East Africa Time ("2026-11-17T08:00" from a
 * datetime-local field) as an exact moment. Returns null if it is not valid.
 */
export function parseEATDateTime(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00+03:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** The value a datetime-local field needs to show this moment in East Africa Time. */
export function toEATInput(date: Date) {
  return new Date(date.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 16);
}
