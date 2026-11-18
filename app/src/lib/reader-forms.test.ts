import { test } from "node:test";
import assert from "node:assert/strict";
import { readMessage } from "./reader-forms";

const now = 1_800_000_000_000;
const ok = { startedAt: String(now - 10_000), now };

test("anonymous tips are accepted", () => {
  const r = readMessage({ kind: "tip", body: "Water has been off in Ntinda for a week.", ...ok });
  assert.ok("message" in r);
  if ("message" in r) assert.deepEqual(r.message, { kind: "tip", name: null, replyTo: null, subject: null, body: "Water has been off in Ntinda for a week." });
});

test("contact and advertising need a way to reply", () => {
  assert.ok("error" in readMessage({ kind: "contact", body: "Hello, a question about your site.", ...ok }));
  assert.ok("message" in readMessage({ kind: "contact", body: "Hello, a question about your site.", replyTo: "reader@example.com", ...ok }));
  assert.ok("message" in readMessage({ kind: "advertise", body: "We would like to advertise.", replyTo: "+256 772 123456", ...ok }));
  assert.ok("error" in readMessage({ kind: "advertise", body: "We would like to advertise.", replyTo: "call me", ...ok }));
});

test("bots are turned away", () => {
  const trap = readMessage({ kind: "tip", body: "Buy cheap watches now please", website: "http://spam", ...ok });
  assert.ok("spam" in trap && trap.spam);
  const fast = readMessage({ kind: "tip", body: "Buy cheap watches now please", startedAt: String(now - 500), now });
  assert.ok("spam" in fast && fast.spam);
  const none = readMessage({ kind: "tip", body: "Buy cheap watches now please", now });
  assert.ok("spam" in none && none.spam);
});

test("lengths and unknown forms", () => {
  assert.ok("error" in readMessage({ kind: "tip", body: "short", ...ok }));
  assert.ok("error" in readMessage({ kind: "tip", body: "x".repeat(5001), ...ok }));
  assert.ok("error" in readMessage({ kind: "letters", body: "A long enough message here.", ...ok }));
});
