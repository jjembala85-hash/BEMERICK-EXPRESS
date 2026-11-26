import { adsTxt, adsenseClient } from "@/lib/adsense";

// Authorised ad sellers (IAB ads.txt). Exists only once the AdSense id is set (D-049).
export function GET() {
  const client = adsenseClient();
  if (!client) return new Response("Not found\n", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  return new Response(adsTxt(client), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
