// Better Auth's public HTTP API is closed on purpose (D-042). The newsroom signs
// in, checks two-step codes and manages staff through server actions that call
// Better Auth on the server, behind our own rate limits and permission checks.
// Leaving /api/auth/* open would let anyone send password guesses straight to
// Better Auth, around those limits. Only a harmless health check stays open.
import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request) {
  if (new URL(request.url).pathname === "/api/auth/ok") return toNextJsHandler(getAuth()).GET(request);
  return notFound();
}

export async function POST() {
  return notFound();
}
