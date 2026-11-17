import { test } from "node:test";
import assert from "node:assert/strict";
import { embedUrl, parseYouTubeId } from "./youtube";

const id = "dQw4w9WgXcQ";

test("youtube: every common link form gives the video id", () => {
  for (const input of [
    id,
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtube.com/watch?v=${id}&t=42s`,
    `https://m.youtube.com/watch?feature=share&v=${id}`,
    `youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}`,
    `https://youtu.be/${id}?si=abc123`,
    `https://www.youtube.com/live/${id}?feature=shared`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/embed/${id}`,
    `https://www.youtube-nocookie.com/embed/${id}`,
    `  https://youtu.be/${id}  `,
  ]) {
    assert.equal(parseYouTubeId(input), id, input);
  }
});

test("youtube: other links and junk are refused", () => {
  for (const bad of [
    "",
    "hello",
    "https://vimeo.com/123456",
    `https://evil.example/watch?v=${id}`,
    `https://youtube.com.evil.example/watch?v=${id}`,
    "https://www.youtube.com/channel/UC123",
    "https://www.youtube.com/watch?v=short",
    "javascript:alert(1)",
  ]) {
    assert.equal(parseYouTubeId(bad), null, bad);
  }
});

test("youtube: embeds use the privacy-enhanced domain", () => {
  assert.ok(embedUrl(id).startsWith("https://www.youtube-nocookie.com/embed/"));
});
