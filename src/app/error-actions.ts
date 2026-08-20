"use server";

import { captureServerError } from "@/lib/log";

export async function reportRouteError(error: { message?: string; name?: string; digest?: string }, route: string) {
  await captureServerError({
    event: "app.route_error.failed",
    route,
    error: { name: error.name, message: error.message },
    metadata: { digest: error.digest },
  });
}
