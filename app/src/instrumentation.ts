import type { Instrumentation } from "next";
import { reportError } from "@/lib/error-report";

// Every server error (pages, server actions, route handlers) goes to Sentry when
// SENTRY_DSN is set (D-041); alerts email the owner. Vercel's logs keep them too.
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  await reportError(error, {
    path: request.path,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
  });
};
