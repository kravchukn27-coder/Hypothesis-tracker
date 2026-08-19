import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionSecret, SESSION_COOKIE_NAME } from "./config";
import { hasCurrentSessionVersion } from "./session-version";
import { verifySessionToken } from "./token";
import type { SessionUser } from "./types";

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

  const user = await prisma.user.findFirst({
    where: { id: payload.sub, isActive: true },
    select: { id: true, name: true, sessionVersion: true },
  });
  if (!user || !hasCurrentSessionVersion(payload, user.sessionVersion)) return null;

  return { id: user.id, name: user.name };
}
