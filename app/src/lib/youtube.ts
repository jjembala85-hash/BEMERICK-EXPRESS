// YouTube links for live streams and bulletins (D-003: YouTube hosts all video).

const ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Reads the video id from whatever the newsroom pastes: a watch link, youtu.be
 * short link, /live/ or /shorts/ link, an embed link, or the bare 11-character id.
 * Returns null when it is not a YouTube video.
 */
export function parseYouTubeId(input: string): string | null {
  const text = input.trim();
  if (ID.test(text)) return text;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, "").toLowerCase();
  let candidate: string | null = null;
  if (host === "youtu.be") {
    candidate = url.pathname.split("/")[1] ?? null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") candidate = url.searchParams.get("v");
    else {
      const m = url.pathname.match(/^\/(?:live|shorts|embed|v)\/([^/?#]+)/);
      candidate = m?.[1] ?? null;
    }
  }
  return candidate && ID.test(candidate) ? candidate : null;
}

/** Privacy-enhanced player address, used only after the reader taps play. */
export function embedUrl(id: string) {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
}

export function watchUrl(id: string) {
  return `https://www.youtube.com/watch?v=${id}`;
}
