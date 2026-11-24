import { test } from "node:test";
import assert from "node:assert/strict";
import { notePath, previousPageIsOurs } from "./nav-history";

test("back stays on the site only while there is a BX News page behind", () => {
  (globalThis as { document?: unknown }).document = { referrer: "https://www.google.com/" };
  (globalThis as { window?: unknown }).window = { location: { origin: "https://bx.example" }, history: { length: 3 } };
  notePath("/uganda/a-story");
  assert.equal(previousPageIsOurs(), false, "arrived from Google");
  notePath("/uganda");
  assert.equal(previousPageIsOurs(), true, "moved to the section");
  notePath("/uganda/a-story");
  assert.equal(previousPageIsOurs(), false, "went back to the first page");
  notePath("/business");
  notePath("/business/b");
  notePath("/business");
  assert.equal(previousPageIsOurs(), true, "one page still behind");
});
