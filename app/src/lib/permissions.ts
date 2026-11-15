// Roles and permissions (docs/03-technical-architecture.md section 7).
// Checked on the server for every action: hiding a button is not security.
export const ROLES = ["admin", "editor", "writer"] as const;
export type Role = (typeof ROLES)[number];

export type Permission =
  | "article.create"
  | "article.edit_any"
  | "article.review"
  | "article.publish"
  | "article.fast_track"
  | "article.unpublish"
  | "homepage.manage"
  | "media.upload"
  | "sections.manage"
  | "corrections.manage"
  | "staff.manage"
  | "audit.view"
  | "settings.manage";

const editorPermissions: Permission[] = [
  "article.create",
  "article.edit_any",
  "article.review",
  "article.publish",
  "article.unpublish",
  "homepage.manage",
  "media.upload",
  "sections.manage",
  "corrections.manage",
  "audit.view",
];

const rolePermissions: Record<Role, readonly Permission[]> = {
  admin: [...editorPermissions, "article.fast_track", "staff.manage", "settings.manage"],
  editor: editorPermissions,
  writer: ["article.create", "media.upload"],
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function can(role: Role, permission: Permission) {
  return rolePermissions[role].includes(permission);
}

export const roleLabels: Record<Role, string> = {
  admin: "Admin",
  editor: "Editor",
  writer: "Writer",
};
