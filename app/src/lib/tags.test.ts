import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTags, MAX_TAGS } from "./tags";

const ok = (input: string) => {
  const result = parseTags(input);
  if ("error" in result) throw new Error(result.error);
  return result.tags;
};

test("tags: split on commas, tidy spaces, keep typed order", () => {
  assert.deepEqual(ok(" Elections 2026 ,  Fuel   prices,KCCA "), [
    { name: "Elections 2026", slug: "elections-2026" },
    { name: "Fuel prices", slug: "fuel-prices" },
    { name: "KCCA", slug: "kcca" },
  ]);
});

test("tags: empty field and empty parts are fine", () => {
  assert.deepEqual(ok(""), []);
  assert.deepEqual(ok(" , ,"), []);
});

test("tags: the same tag typed twice (any case) is kept once", () => {
  assert.deepEqual(ok("Fuel prices, fuel PRICES, fuel-prices"), [{ name: "Fuel prices", slug: "fuel-prices" }]);
});

test("tags: too many, too long or symbol-only are refused", () => {
  const many = Array.from({ length: MAX_TAGS + 1 }, (_, i) => `tag ${i}`).join(",");
  assert.ok("error" in parseTags(many));
  assert.ok("error" in parseTags("x".repeat(41)));
  assert.ok("error" in parseTags("!!!"));
  assert.ok("error" in parseTags("a"));
});
