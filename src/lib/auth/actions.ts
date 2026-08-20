"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionSecret, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SEC } from "./config";
import { clearLoginFailures, getLoginClientIp, isLoginRateLimited, normalizeLoginEmail, recordLoginFailure } from "./login-rate-limit";
import { verifyPassword } from "./password";
import { getCurrentUser } from "./session";
import { signSessionToken } from "./token";
import { safeWriteAuditLog, writeAuditLog } from "@/lib/audit-log";

function redirectToLogin(error: "credentials" | "ratelimit"): never {
  redirect(`/login?error=${error}`);
}

function safeReturnPath(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/";
}

export async function loginAsUser(formData: FormData): Promise<void> {
  const email = normalizeLoginEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const from = safeReturnPath(String(formData.get("from") ?? "/"));
  const ip = await getLoginClientIp();

  if (await isLoginRateLimited(ip, email)) {
    await safeWriteAuditLog({ event: "LOGIN_FAILURE", userId: null, metadata: { reason: "rate_limited", email, ip }, route: "src/lib/auth/actions.ts" });
    redirectToLogin("ratelimit");
  }

  const user = email
    ? await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { id: true, passwordHash: true, sessionVersion: true, isActive: true },
      })
    : null;

  if (!user || !user.isActive || !user.passwordHash || !password || !verifyPassword(password, user.passwordHash)) {
    const rateLimited = await recordLoginFailure(ip, email);
    await safeWriteAuditLog({ event: "LOGIN_FAILURE", userId: user?.id ?? null, metadata: { reason: "invalid_credentials", email, ip }, route: "src/lib/auth/actions.ts" });
    redirectToLogin(rateLimited ? "ratelimit" : "credentials");
  }

  await clearLoginFailures(ip, email);
  const token = await signSessionToken(
    user.id,
    user.sessionVersion,
    crypto.randomUUID(),
    getSessionSecret(),
    SESSION_MAX_AGE_SEC,
  );
  (await cookies()).set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
  await safeWriteAuditLog({ event: "LOGIN_SUCCESS", userId: user.id, metadata: { ip }, route: "src/lib/auth/actions.ts" });
  redirect(from);
}

export async function logout(): Promise<void> {
  const user = await getCurrentUser();
  if (user) await writeAuditLog({ event: "LOGOUT", userId: user.id });

  (await cookies()).set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
  redirect("/login");
}
