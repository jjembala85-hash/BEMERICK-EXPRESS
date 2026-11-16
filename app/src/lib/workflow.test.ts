// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  availableActions,
  canEditContent,
  nextStatus,
  parseEATDateTime,
  toEATInput,
  type StoryContext,
} from "./workflow";

const ctx = (over: Partial<StoryContext>): StoryContext => ({
  role: "writer",
  isOwner: true,
  status: "draft",
  legalHold: false,
  ...over,
});

test("writer: can submit own draft, but cannot publish, approve or schedule", () => {
  assert.deepEqual(availableActions(ctx({})), ["submit"]);
  assert.deepEqual(availableActions(ctx({ status: "changes_requested" })), ["submit"]);
  for (const status of ["in_review", "approved", "scheduled", "published", "unpublished", "spiked"] as const) {
    assert.deepEqual(availableActions(ctx({ status })), [], status);
  }
});

test("writer cannot submit someone else's draft", () => {
  assert.deepEqual(availableActions(ctx({ isOwner: false })), []);
});

test("writer edits only while the story is with them", () => {
  assert.ok(canEditContent(ctx({ status: "draft" })));
  assert.ok(canEditContent(ctx({ status: "changes_requested" })));
  assert.equal(canEditContent(ctx({ status: "in_review" })), false);
  assert.equal(canEditContent(ctx({ status: "published" })), false);
  assert.equal(canEditContent(ctx({ isOwner: false })), false);
});

test("editor reviews: approve, approve-and-publish, send back, spike", () => {
  assert.deepEqual(availableActions(ctx({ role: "editor", isOwner: false, status: "in_review" })), [
    "approve_publish",
    "approve",
    "request_changes",
    "spike",
  ]);
});

test("editor cannot fast-track a draft past review", () => {
  const actions = availableActions(ctx({ role: "editor", isOwner: false }));
  assert.deepEqual(actions, ["submit"]);
});

test("admin can fast-track a draft (one-person newsroom, breaking news)", () => {
  assert.deepEqual(availableActions(ctx({ role: "admin" })), ["submit", "publish", "schedule"]);
});

test("approved stories can be published or scheduled by an editor", () => {
  assert.deepEqual(availableActions(ctx({ role: "editor", isOwner: false, status: "approved" })), ["publish", "schedule"]);
  assert.deepEqual(availableActions(ctx({ role: "editor", status: "scheduled" })), ["unschedule"]);
});

test("legal hold blocks every route to publication", () => {
  for (const role of ["admin", "editor"] as const) {
    for (const status of ["draft", "in_review", "approved", "unpublished"] as const) {
      const actions = availableActions(ctx({ role, status, legalHold: true }));
      for (const blocked of ["publish", "approve_publish", "schedule"] as const) {
        assert.equal(actions.includes(blocked), false, `${role} ${status} ${blocked}`);
      }
    }
  }
});

test("live stories: editor and admin can unpublish; spiked and unpublished can be restored", () => {
  assert.deepEqual(availableActions(ctx({ role: "editor", status: "published" })), ["unpublish"]);
  assert.deepEqual(availableActions(ctx({ role: "admin", status: "unpublished" })), ["publish", "restore"]);
  assert.deepEqual(availableActions(ctx({ role: "editor", status: "spiked" })), ["restore"]);
});

test("each action lands on the documented status", () => {
  assert.equal(nextStatus("submit"), "in_review");
  assert.equal(nextStatus("request_changes"), "changes_requested");
  assert.equal(nextStatus("approve"), "approved");
  assert.equal(nextStatus("approve_publish"), "published");
  assert.equal(nextStatus("schedule"), "scheduled");
  assert.equal(nextStatus("unschedule"), "approved");
  assert.equal(nextStatus("spike"), "spiked");
  assert.equal(nextStatus("restore"), "draft");
  assert.equal(nextStatus("unpublish"), "unpublished");
});

test("schedule times are read as East Africa Time", () => {
  const d = parseEATDateTime("2026-11-17T08:00");
  assert.equal(d?.toISOString(), "2026-11-17T05:00:00.000Z");
  assert.equal(toEATInput(d!), "2026-11-17T08:00");
  assert.equal(parseEATDateTime("tomorrow"), null);
  assert.equal(parseEATDateTime("2026-13-40T99:00"), null);
});
