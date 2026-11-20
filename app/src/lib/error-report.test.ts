import { test } from "node:test";
import assert from "node:assert/strict";
import { buildEnvelope, isExpected, parseDsn, stackFrames } from "./error-report";

const dsn = "https://abc123def@o4501.ingest.de.sentry.io/4507";

test("DSN: real Sentry DSNs parse, anything else is ignored", () => {
  assert.deepEqual(parseDsn(dsn), { endpoint: "https://o4501.ingest.de.sentry.io/api/4507/envelope/", publicKey: "abc123def" });
  for (const bad of [undefined, "", "not a url", "http://abc@o1.ingest.sentry.io/1", "https://o1.ingest.sentry.io/1", "https://abc@evil.example/1", "https://abc@o1.ingest.sentry.io/x"]) {
    assert.equal(parseDsn(bad), null, String(bad));
  }
});

test("stack frames are parsed, oldest first, app code marked", () => {
  const frames = stackFrames("Error: boom\n    at getStory (/var/task/app/src/lib/queries/public.ts:12:5)\n    at async Page (/var/task/node_modules/next/dist/server.js:1:2)");
  assert.equal(frames.length, 2);
  assert.equal(frames[1].function, "getStory");
  assert.equal(frames[1].in_app, true);
  assert.equal(frames[0].in_app, false);
});

test("not-found and redirect signals are not reported", () => {
  assert.ok(isExpected(Object.assign(new Error("x"), { digest: "NEXT_HTTP_ERROR_FALLBACK;404" })));
  assert.ok(isExpected(Object.assign(new Error("x"), { digest: "NEXT_REDIRECT;replace;/x;307;" })));
  assert.equal(isExpected(new Error("real")), false);
});

test("envelope carries the error and path but no query string or headers", () => {
  const body = buildEnvelope(new TypeError("db down"), { path: "/search?q=secret+tip", method: "GET", routePath: "/search", routeType: "render" }, {
    dsn,
    environment: "production",
    eventId: "0123456789abcdef0123456789abcdef",
    now: new Date("2026-11-20T10:00:00Z"),
  });
  const [header, item, payload] = body.split("\n").map((l) => JSON.parse(l));
  assert.equal(header.event_id, "0123456789abcdef0123456789abcdef");
  assert.equal(item.type, "event");
  assert.equal(payload.exception.values[0].type, "TypeError");
  assert.equal(payload.exception.values[0].value, "db down");
  assert.equal(payload.request.url, "/search");
  assert.ok(!body.includes("secret"), "query strings are never sent");
  assert.equal(payload.request.headers, undefined);
});
