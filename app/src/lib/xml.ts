// Small helpers for the XML feeds (RSS, Google News sitemap).

/** Escapes text for XML, and drops characters XML does not allow at all. */
export function xmlEscape(text: string) {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function xmlResponse(body: string, maxAgeSeconds = 300) {
  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": `public, max-age=60, s-maxage=${maxAgeSeconds}, stale-while-revalidate=3600`,
    },
  });
}
