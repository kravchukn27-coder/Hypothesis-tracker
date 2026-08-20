import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionSecret, SESSION_COOKIE_NAME } from "./config";
import { hasCurrentSessionVersion } from "./session-version";
import { verifySessionToken } from "./token";
import type { SessionUser } from "./types";
import { captureServerError } from "@/lib/log";

export async function getCurrentUser(): Promise<SessionUser | null> {
  let secret: string;
  try {
    secret = getSessionSecret();
  } catch {
    return null;
  }

  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const payload = await verifySessionToken(token, secret);
  if (!payload) return null;

  let user: { id: string; name: string; sessionVersion: number } | null;
  try {
    user = await prisma.user.findFirst({
      where: { id: payload.sub, isActive: true },
      select: { id: true, name: true, sessionVersion: true },
    });
  } catch (error) {
    await captureServerError({
      event: "auth.get_current_user.failed",
      route: "src/lib/auth/session.ts#getCurrentUser",
      error,
    });
    return null;
  }
  if (!user || !hasCurrentSessionVersion(payload, user.sessionVersion)) return null;

  return { id: user.id, name: user.name };
}
