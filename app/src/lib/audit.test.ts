import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { AUDIT_AREAS, describeAction, detailPairs, isAuditArea } from "./audit";
import type { WorkflowAction } from "./workflow";

test("audit: known actions read as plain English", () => {
  assert.equal(describeAction("article.publish"), "published a story");
  assert.equal(describeAction("staff.change_role"), "changed a staff role");
  assert.equal(describeAction("article.create_and_publish"), "created and published a story");
  assert.equal(describeAction("article.create_and_submit"), "created and sent a story");
});

test("audit: unknown actions still show something readable", () => {
  assert.equal(describeAction("thing.did_stuff"), "thing did stuff");
});

test("audit: every workflow action has wording", () => {
  const all: WorkflowAction[] = ["submit", "approve", "approve_publish", "request_changes", "spike", "restore", "publish", "schedule", "unschedule", "unpublish"];
  for (const a of all) assert.notEqual(describeAction(`article.${a}`), `article ${a}`.replace(/_/g, " "), a);
});

test("audit: every action name written in the code has wording and an area", () => {
  // Scan the source for action: "x.y" so a new audited action cannot be forgotten here.
  const root = join(import.meta.dirname, "..");
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.tsx?$/.test(name) && !name.endsWith(".test.ts")) files.push(path);
    }
  };
  walk(root);
  const found = new Set<string>();
  for (const f of files) {
    for (const m of readFileSync(f, "utf8").matchAll(/action: (?:[^"\n]*\? )?"([a-z]+\.[a-z_]+)"(?: : "([a-z]+\.[a-z_]+)")?/g)) {
      found.add(m[1]);
      if (m[2]) found.add(m[2]);
    }
  }
  assert.ok(found.size > 15, `only found ${found.size}`);
  const prefixes = Object.values(AUDIT_AREAS).flatMap((a) => [...a.prefixes]);
  for (const action of found) {
    assert.notEqual(describeAction(action), action.replace(/[._]/g, " "), `no wording for ${action}`);
    assert.ok(prefixes.some((p) => action.startsWith(p)), `no area for ${action}`);
  }
});

test("audit: details become labelled pairs", () => {
  assert.deepEqual(detailPairs({ fromStatus: "draft", toStatus: "in_review", note: "" }), [
    ["From", "Draft"],
    ["To", "In review"],
  ]);
  assert.deepEqual(detailPairs(null), []);
  assert.deepEqual(detailPairs({ someNewThing: 3 }), [["Some New Thing", "3"]]);
});

test("audit: area names are checked", () => {
  assert.ok(isAuditArea("stories"));
  assert.equal(isAuditArea("toString"), false);
  assert.equal(isAuditArea("x"), false);
});
