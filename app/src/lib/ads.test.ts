import { test } from "node:test";
import assert from "node:assert/strict";
import { adState, ctr, isAdSlot, parseAdLink, pickAd } from "./ads";

test("advertiser links: https only, bare domains get https", () => {
  assert.equal(parseAdLink("example.co.ug/offer"), "https://example.co.ug/offer");
  assert.equal(parseAdLink(" https://shop.example.com/?utm_source=bx "), "https://shop.example.com/?utm_source=bx");
  for (const bad of ["", "http://example.com", "javascript:alert(1)", "data:text/html,x", "https://localhost", "https://user:pw@example.com", "ftp://example.com"]) {
    assert.equal(parseAdLink(bad), null, bad);
  }
});

test("ad state follows pause and dates", () => {
  const now = new Date("2026-11-20T10:00:00Z");
  const day = 86400_000;
  assert.equal(adState({ paused: false, startsAt: new Date(+now - day), endsAt: null }, now), "running");
  assert.equal(adState({ paused: false, startsAt: new Date(+now + day), endsAt: null }, now), "scheduled");
  assert.equal(adState({ paused: true, startsAt: new Date(+now - day), endsAt: null }, now), "paused");
  assert.equal(adState({ paused: true, startsAt: new Date(+now - 2 * day), endsAt: new Date(+now - day) }, now), "ended");
});

test("ads in the same slot take turns", () => {
  const ads = [
    { id: "b", slots: ["home_top"] },
    { id: "a", slots: ["home_top", "story"] },
    { id: "c", slots: ["story"] },
  ];
  assert.equal(pickAd(ads, "section", 3), null);
  const seen = new Set([0, 1, 2, 3].map((t) => pickAd(ads, "home_top", t)?.id));
  assert.deepEqual([...seen].sort(), ["a", "b"]);
  assert.equal(pickAd(ads, "story", 0)?.id, "a");
  assert.equal(pickAd(ads, "story", 1)?.id, "c");
});

test("slots and CTR", () => {
  assert.ok(isAdSlot("home_top"));
  assert.equal(isAdSlot("popup"), false);
  assert.equal(ctr(0, 0), "–");
  assert.equal(ctr(1000, 14), "1.4%");
});
