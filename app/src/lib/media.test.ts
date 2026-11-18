import { test } from "node:test";
import assert from "node:assert/strict";
import { MEDIA_KEY, mediaOriginUrl, mediaUrl } from "./media";

const key = "photos/2026/11/3f2b8c1e-1d2a-4b7c-9e0f-123456789abc-960.webp";

test("photo keys: real keys pass, anything else is refused", () => {
  assert.ok(MEDIA_KEY.test(key));
  assert.ok(MEDIA_KEY.test(key.replace(".webp", ".jpg")));
  for (const bad of ["../secret", "photos/2026/11/x.webp", `${key}?x=1`, "photos/2026/11/../../etc/passwd", "team/a.webp", ""]) {
    assert.equal(MEDIA_KEY.test(bad), false, bad);
  }
});

test("readers get photos through /img unless a photo domain is set", () => {
  delete process.env.MEDIA_PUBLIC_URL;
  assert.ok(mediaUrl(key).endsWith(`/img/${key}`));
  process.env.MEDIA_PUBLIC_URL = "https://img.example.com/";
  assert.equal(mediaUrl(key), `https://img.example.com/${key}`);
  delete process.env.MEDIA_PUBLIC_URL;
  assert.ok(mediaOriginUrl(key).includes(".r2.dev/photos/"));
});
