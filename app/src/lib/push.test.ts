import { test } from "node:test";
import assert from "node:assert/strict";
import { alertPayload, parseSubscription } from "./push";

const keys = { p256dh: "B".repeat(87), auth: "a".repeat(22) };

test("alert sign-ups are accepted only for real browser push services", () => {
  for (const endpoint of [
    "https://fcm.googleapis.com/fcm/send/abc",
    "https://updates.push.services.mozilla.com/wpush/v2/abc",
    "https://wns2-db5p.notify.windows.com/w/?token=abc",
    "https://web.push.apple.com/abc",
  ]) {
    assert.ok(parseSubscription({ endpoint, keys }), endpoint);
  }
  for (const endpoint of [
    "https://evil.example/hook",
    "http://fcm.googleapis.com/fcm/send/abc",
    "https://fcm.googleapis.com.evil.example/x",
    "https://user:pw@fcm.googleapis.com/x",
    "https://fcm.googleapis.com:8443/x",
    "https://localhost/x",
  ]) {
    assert.equal(parseSubscription({ endpoint, keys }), null, endpoint);
  }
  assert.equal(parseSubscription({ endpoint: "https://fcm.googleapis.com/x", keys: { p256dh: "short", auth: "a" } }), null);
  assert.equal(parseSubscription(null), null);
});

test("alert links stay on our own site", () => {
  assert.equal(JSON.parse(alertPayload({ title: "t", body: "b", path: "//evil.example" })).url, "/");
  assert.equal(JSON.parse(alertPayload({ title: "t", body: "b", path: "https://evil.example" })).url, "/");
  assert.equal(JSON.parse(alertPayload({ title: "t", body: "b", path: "/uganda/story" })).url, "/uganda/story");
});
