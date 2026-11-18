import { test } from "node:test";
import assert from "node:assert/strict";
import { xmlEscape } from "./xml";

test("xml: special characters are escaped", () => {
  assert.equal(xmlEscape(`Tom & Jerry's "<b>" show`), "Tom &amp; Jerry&apos;s &quot;&lt;b&gt;&quot; show");
});

test("xml: characters XML forbids are removed, normal text kept", () => {
  assert.equal(xmlEscape("a\u0000b\u0008c\nd\te"), "abc\nd\te");
  assert.equal(xmlEscape("Kampala · UGX 4,950 — ✓"), "Kampala · UGX 4,950 — ✓");
});
