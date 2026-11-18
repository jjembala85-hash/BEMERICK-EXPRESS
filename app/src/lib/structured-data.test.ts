/* eslint-disable @typescript-eslint/no-explicit-any -- reading nested JSON-LD in assertions */
import { test } from "node:test";
import assert from "node:assert/strict";
import { breadcrumbs, jsonLdText, newsArticle } from "./structured-data";

const base = { path: "/business/fuel", headline: "Fuel prices fall", description: "Short.", section: "Business", sectionPath: "/business", published: new Date("2026-11-17T08:00:00Z"), modified: null, images: ["/share/business/fuel/link"], authors: [{ name: "Jane Namuli", path: "/author/jane-namuli" }, { name: "Desk", path: null }] };

test("NewsArticle has what Google needs", () => {
  const a = newsArticle(base) as Record<string, any>;
  assert.equal(a["@type"], "NewsArticle");
  assert.equal(a.datePublished, "2026-11-17T08:00:00.000Z");
  assert.equal(a.dateModified, a.datePublished, "falls back to published when never updated");
  assert.ok(a.image[0].startsWith("http") && a.image[0].endsWith("/share/business/fuel/link"), "images are absolute");
  assert.ok(a.author[0].url.endsWith("/author/jane-namuli"));
  assert.equal(a.author[1].url, undefined);
  assert.equal(a.video, undefined);
});

test("bulletins carry a VideoObject", () => {
  const a = newsArticle({ ...base, video: { id: "M7lc1UVf-VE" } }) as Record<string, any>;
  assert.equal(a.video["@type"], "VideoObject");
  assert.ok(a.video.embedUrl.includes("youtube-nocookie.com/embed/M7lc1UVf-VE"));
});

test("headlines cannot break out of the script tag", () => {
  const text = jsonLdText(newsArticle({ ...base, headline: "</script><script>alert(1)</script>" }));
  assert.ok(!text.includes("</script>"));
  assert.ok(text.includes("\\u003c/script>"));
  assert.equal(JSON.parse(text).headline, "</script><script>alert(1)</script>", "still valid JSON with the real headline");
});

test("breadcrumbs are numbered from 1", () => {
  const b = breadcrumbs([{ name: "Home", path: "/" }, { name: "Business", path: "/business" }]) as Record<string, any>;
  assert.deepEqual(b.itemListElement.map((i: { position: number }) => i.position), [1, 2]);
});
