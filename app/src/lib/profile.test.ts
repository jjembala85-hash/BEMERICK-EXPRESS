import { test } from "node:test";
import assert from "node:assert/strict";
import { parseXHandle } from "./profile";

test("X handle accepts @name, name and profile links", () => {
  assert.equal(parseXHandle("@bxnews"), "bxnews");
  assert.equal(parseXHandle("  BX_News "), "BX_News");
  assert.equal(parseXHandle("https://x.com/bxnews"), "bxnews");
  assert.equal(parseXHandle("twitter.com/bxnews/"), "bxnews");
  assert.equal(parseXHandle("https://www.x.com/bxnews?s=21"), "bxnews");
});

test("X handle: empty is allowed, anything else odd is refused", () => {
  assert.equal(parseXHandle(""), null);
  for (const bad of ["@", "bx news", "bx-news", "a".repeat(16), "https://evil.example/bxnews", "javascript:alert(1)"]) {
    assert.equal(parseXHandle(bad), false, bad);
  }
});
