// One-click unsubscribe (RFC 8058): email apps such as Gmail POST here when the
// reader taps their built-in "Unsubscribe" button. The link is signed per reader.
import { unsubscribeNow } from "@/app/(public)/newsletter/actions";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const ok = await unsubscribeNow(url.searchParams.get("id") ?? "", url.searchParams.get("t") ?? "");
  return new Response(ok ? "Unsubscribed" : "Not found", { status: ok ? 200 : 404, headers: { "Cache-Control": "no-store" } });
}
