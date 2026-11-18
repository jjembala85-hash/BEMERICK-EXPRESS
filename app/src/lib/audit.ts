// Plain-English wording for audit log entries (newsroom History page).
// Action names are written by server actions across the app, e.g. "article.publish".
import { isStatus, statusLabels } from "./workflow";

const labels: Record<string, string> = {
  "article.create": "created a story",
  "article.update_published": "edited a live story",
  "article.submit": "sent a story for review",
  "article.approve": "approved a story",
  "article.approve_publish": "approved and published a story",
  "article.request_changes": "sent a story back for changes",
  "article.spike": "spiked a story",
  "article.restore": "restored a story to draft",
  "article.publish": "published a story",
  "article.fast_track_publish": "published a story without review (admin fast-track)",
  "article.schedule": "scheduled a story",
  "article.unschedule": "cancelled a story's schedule",
  "article.unpublish": "unpublished a story",
  "article.publish_scheduled": "marked a scheduled story as published",
  "article.correction": "added a correction",
  "article.legal_hold": "put a story on legal hold",
  "article.legal_clear": "cleared a legal hold",
  "homepage.update": "changed the homepage",
  "breaking.start": "started a breaking banner",
  "breaking.clear": "removed the breaking banner",
  "live.schedule": "scheduled a live stream",
  "live.start": "went live",
  "live.end": "ended a live stream",
  "live.update": "updated a live stream",
  "live.delete": "deleted a live stream",
  "media.upload": "uploaded a photo",
  "media.update": "changed a photo's details",
  "media.delete": "deleted a photo",
  "tag.update": "edited a tag",
  "tag.merge": "merged two tags",
  "tag.delete": "deleted a tag",
  "inbox.delete": "deleted a reader message",
  "staff.invite": "added a staff member",
  "staff.new_link": "made a new sign-in link",
  "staff.set_password": "set their password from an invite link",
  "staff.change_role": "changed a staff role",
  "staff.deactivate": "deactivated an account",
  "staff.reactivate": "reactivated an account",
  "staff.reset_two_factor": "reset two-step sign-in for",
  "security.two_factor_on": "turned on two-step sign-in",
  "security.two_factor_off": "turned off two-step sign-in",
  "security.backup_codes": "made new backup codes",
  "profile.update": "updated a byline profile",
  "setup.first_admin": "created the first administrator account",
};

/** "article.create_and_publish" -> "created and published a story". */
export function describeAction(action: string) {
  if (labels[action]) return labels[action];
  const created = action.match(/^article\.create_and_(\w+)$/);
  if (created) {
    const then = labels[`article.${created[1]}`];
    if (then) return `created and ${then.replace(/ a story.*$/, "")} a story`;
  }
  return action.replace(/[._]/g, " ");
}

export const AUDIT_AREAS = {
  stories: { label: "Stories", prefixes: ["article."] },
  homepage: { label: "Homepage, breaking & live", prefixes: ["homepage.", "breaking.", "live."] },
  photos: { label: "Photos", prefixes: ["media."] },
  tags: { label: "Tags", prefixes: ["tag."] },
  inbox: { label: "Inbox", prefixes: ["inbox."] },
  people: { label: "Staff & profiles", prefixes: ["staff.", "profile.", "setup.", "security."] },
} as const;

export type AuditArea = keyof typeof AUDIT_AREAS;

export function isAuditArea(value: unknown): value is AuditArea {
  return typeof value === "string" && Object.hasOwn(AUDIT_AREAS, value);
}

/** Actions that deserve a second look (shown highlighted). */
export function isSensitive(action: string) {
  return /^(article\.(unpublish|fast_track_publish|legal_hold|legal_clear|spike|create_and_publish)|staff\.(change_role|deactivate|reactivate|invite|reset_two_factor)|security\.two_factor_off|media\.delete|tag\.(merge|delete)|setup\.)/.test(
    action,
  );
}

const detailLabels: Record<string, string> = {
  fromStatus: "From",
  toStatus: "To",
  scheduledFor: "Scheduled for",
  note: "Note",
  headline: "Headline",
  checklist: "Checklist",
  reason: "Reason",
  role: "Role",
  from: "From",
  to: "To",
  email: "Email",
  credit: "Credit",
  creditBefore: "Credit before",
  creditAfter: "Credit after",
  nameBefore: "Name before",
  nameAfter: "Name after",
  merged: "Merged",
  into: "Into",
  name: "Name",
  authorPage: "Author page",
  text: "Text",
};

/** Turns the stored details object into label/value pairs, skipping empty values. */
export function detailPairs(details: unknown): [string, string][] {
  if (!details || typeof details !== "object" || Array.isArray(details)) return [];
  return Object.entries(details as Record<string, unknown>)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => [
      detailLabels[k] ?? k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()),
      typeof v === "string" ? ((k === "fromStatus" || k === "toStatus") && isStatus(v) ? statusLabels[v] : v) : JSON.stringify(v),
    ]);
}
