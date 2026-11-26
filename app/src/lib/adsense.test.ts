import { test } from "node:test";
import assert from "node:assert/strict";
import { adsTxt, adsenseClient, adsenseEnabled, adsenseSlot } from "./adsense";
import { parseConsent, serializeConsent } from "./consent";

test("AdSense stays off until both ids are set and well formed", () => {
  assert.equal(adsenseEnabled({}), false);
  assert.equal(adsenseEnabled({ NEXT_PUBLIC_ADSENSE_CLIENT: "ca-pub-1234567890123456" }), false);
  assert.equal(adsenseEnabled({ NEXT_PUBLIC_ADSENSE_CLIENT: "ca-pub-1234567890123456", NEXT_PUBLIC_ADSENSE_SLOT: " 9876543210 " }), true);
  assert.equal(adsenseClient({ NEXT_PUBLIC_ADSENSE_CLIENT: " ca-pub-1234567890123456 " }), "ca-pub-1234567890123456");
  for (const bad of ["pub-1234567890123456", "ca-pub-12", "ca-pub-123456789012345x", "ca-pub-1234567890\"><script>"]) {
    assert.equal(adsenseClient({ NEXT_PUBLIC_ADSENSE_CLIENT: bad }), null, bad);
  }
  assert.equal(adsenseSlot({ NEXT_PUBLIC_ADSENSE_SLOT: "abc" }), null);
});

test("ads.txt names Google with the pub id", () => {
  assert.equal(adsTxt("ca-pub-1234567890123456"), "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n");
});

test("consent is read back, and asked again after 12 months or if damaged", () => {
  const now = Date.parse("2026-11-26T10:00:00Z");
  assert.equal(parseConsent(null, now), "unset");
  assert.equal(parseConsent(serializeConsent(true, new Date(now - 86400_000)), now), "yes");
  assert.equal(parseConsent(serializeConsent(false, new Date(now - 300 * 86400_000)), now), "no");
  assert.equal(parseConsent(serializeConsent(true, new Date(now - 366 * 86400_000)), now), "unset");
  assert.equal(parseConsent(serializeConsent(true, new Date(now + 86400_000)), now), "unset");
  for (const bad of ["yes", "{", "{}", '{"ads":"true","at":"2026-11-25T00:00:00Z"}', '{"ads":true}', '{"ads":true,"at":"soon"}']) {
    assert.equal(parseConsent(bad, now), "unset", bad);
  }
});
