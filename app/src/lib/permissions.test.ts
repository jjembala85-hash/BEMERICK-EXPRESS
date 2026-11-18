// Run with: npm test
// These rules decide who can publish and manage staff, so any change to them
// should be deliberate and should make a test here change too.
import { test } from "node:test";
import assert from "node:assert/strict";
import { can, isRole, ROLES, type Permission } from "./permissions";

const allPermissions: Permission[] = [
  "article.create",
  "article.edit_any",
  "article.review",
  "article.publish",
  "article.fast_track",
  "article.unpublish",
  "homepage.manage",
  "media.upload",
  "media.manage",
  "sections.manage",
  "tags.manage",
  "inbox.read",
  "corrections.manage",
  "legal.clear",
  "staff.manage",
  "audit.view",
  "settings.manage",
];

test("admin can do everything", () => {
  for (const p of allPermissions) assert.ok(can("admin", p), p);
});

test("writer can only write stories and upload photos", () => {
  const allowed = allPermissions.filter((p) => can("writer", p));
  assert.deepEqual(allowed.sort(), ["article.create", "media.upload"]);
});

test("writer cannot publish, unpublish, edit others' stories or open staff settings", () => {
  for (const p of ["article.publish", "article.unpublish", "article.edit_any", "staff.manage", "settings.manage"] as const) {
    assert.equal(can("writer", p), false, p);
  }
});

test("editor runs the newsroom but cannot manage staff, settings or skip review", () => {
  for (const p of ["article.publish", "article.unpublish", "article.edit_any", "homepage.manage", "media.manage", "tags.manage", "inbox.read", "audit.view"] as const) {
    assert.ok(can("editor", p), p);
  }
  for (const p of ["staff.manage", "settings.manage", "article.fast_track", "legal.clear"] as const) {
    assert.equal(can("editor", p), false, p);
  }
});

test("isRole accepts only the three staff roles", () => {
  for (const r of ROLES) assert.ok(isRole(r));
  for (const bad of ["user", "Admin", "", null, undefined, 1, "admin "]) assert.equal(isRole(bad), false, String(bad));
});
