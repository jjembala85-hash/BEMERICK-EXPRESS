import { test } from "node:test";
import assert from "node:assert/strict";
import { hashtag, keySentences, shareImagePath, tiktokScript, whatsappText, xLength, xText, X_LIMIT, type ShareStory } from "./share";

const story: ShareStory = {
  headline: "Fuel prices fall for a second month",
  standfirst: "Pump prices in Kampala dropped by UGX 150 a litre.",
  section: "Business",
  url: "https://bemerickexpress.vercel.app/business/fuel-prices-fall",
  tags: ["Fuel prices", "Kampala"],
  body: "Petrol now costs UGX 4,950. Diesel fell to UGX 4,700. Traders say transport fares may follow. Short one.",
  host: "bemerickexpress.vercel.app",
};

test("share image path carries a version so apps refresh after edits", () => {
  assert.equal(shareImagePath("business", "x", "link"), "/share/business/x/link");
  assert.equal(shareImagePath("business", "x", "square", new Date(1_700_000_000_000)), "/share/business/x/square?v=1700000000");
});

test("WhatsApp text: kicker, bold headline, summary, link", () => {
  const text = whatsappText(story);
  assert.ok(text.startsWith("📰 *BUSINESS*"));
  assert.ok(text.includes("*Fuel prices fall for a second month*"));
  assert.ok(text.includes(story.standfirst!));
  assert.ok(text.endsWith(story.url));
  assert.ok(whatsappText({ ...story, breaking: true }).startsWith("🔴 *BREAKING*"));
  // Stray asterisks in a headline must not break WhatsApp bold.
  assert.ok(whatsappText({ ...story, headline: "A *very* big day" }).includes("*A very big day*"));
});

test("hashtags", () => {
  assert.equal(hashtag("Fuel prices"), "#FuelPrices");
  assert.equal(hashtag("Elections 2026"), "#Elections2026");
  assert.equal(hashtag("2026"), null);
  assert.equal(hashtag("!!!"), null);
});

test("X text fits 280 with links counted as 23", () => {
  const text = xText(story);
  assert.ok(text.includes("#FuelPrices #Kampala"));
  assert.ok(xLength(text) <= X_LIMIT);
  const long = xText({ ...story, headline: "Very long headline ".repeat(20).trim() });
  assert.ok(xLength(long) <= X_LIMIT, String(xLength(long)));
  assert.ok(long.includes(story.url), "link is never cut");
  assert.ok(xText({ ...story, breaking: true }).startsWith("BREAKING: "));
});

test("TikTok script uses the story's first full sentences", () => {
  assert.deepEqual(keySentences(story.body!), ["Petrol now costs UGX 4,950.", "Diesel fell to UGX 4,700.", "Traders say transport fares may follow."]);
  const script = tiktokScript(story);
  assert.ok(script.startsWith(`HOOK (first 3 seconds): ${story.headline}`));
  assert.ok(script.includes("1. Pump prices in Kampala dropped by UGX 150 a litre."));
  assert.ok(script.includes(`Full details at ${story.host}`));
});
