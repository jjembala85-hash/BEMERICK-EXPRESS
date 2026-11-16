// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { assembleHomepage, type PlacedSlot } from "./homepage";

type C = { id: string; headline: string; priority: string };
const story = (id: string, priority = "normal"): C => ({ id, headline: `Story ${id}`, priority });
const newest = ["a", "b", "c", "d", "e", "f", "g"].map((id) => story(id));
const now = new Date("2026-11-16T12:00:00Z");
const slot = (zone: string, position: number, s: C, extra: Partial<PlacedSlot<C>> = {}): PlacedSlot<C> => ({
  zone,
  position,
  pinnedUntil: null,
  overrideHeadline: null,
  story: s,
  ...extra,
});
const ids = (list: C[]) => list.map((s) => s.id);

test("empty board: newest leads, next four are top stories", () => {
  const h = assembleHomepage([], newest, now);
  assert.equal(h.lead?.id, "a");
  assert.deepEqual(ids(h.top), ["b", "c", "d", "e"]);
  assert.deepEqual(ids(h.latest), ["f", "g"]);
});

test("empty board: an 'important' story leads over a newer normal one", () => {
  const list = [story("a"), story("b", "important"), story("c")];
  assert.equal(assembleHomepage([], list, now).lead?.id, "b");
});

test("editor picks lead and top in order; gaps fill with newest; nothing repeats", () => {
  const h = assembleHomepage([slot("lead", 0, story("e")), slot("top", 2, story("g")), slot("top", 1, story("c"))], newest, now);
  assert.equal(h.lead?.id, "e");
  assert.deepEqual(ids(h.top), ["c", "g", "a", "b"]);
  assert.deepEqual(ids(h.latest), ["d", "f"]);
});

test("expired pins fall back automatically", () => {
  const past = new Date("2026-11-16T11:00:00Z");
  const future = new Date("2026-11-16T13:00:00Z");
  const h = assembleHomepage(
    [slot("lead", 0, story("f"), { pinnedUntil: past }), slot("top", 1, story("g"), { pinnedUntil: future })],
    newest,
    now,
  );
  assert.equal(h.lead?.id, "a");
  assert.equal(h.top[0].id, "g");
});

test("the same story picked twice is shown once", () => {
  const h = assembleHomepage([slot("lead", 0, story("b")), slot("top", 1, story("b"))], newest, now);
  const all = [h.lead!, ...h.top, ...h.latest].map((s) => s.id);
  assert.equal(new Set(all).size, all.length);
});

test("homepage-only headline replaces the real one", () => {
  const h = assembleHomepage([slot("lead", 0, story("c"), { overrideHeadline: "Short lead" })], newest, now);
  assert.equal(h.lead?.headline, "Short lead");
});

test("no stories at all: nothing to show", () => {
  const h = assembleHomepage([], [], now);
  assert.equal(h.lead, null);
  assert.deepEqual(h.top, []);
});
