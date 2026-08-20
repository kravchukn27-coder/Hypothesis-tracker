import { redirect } from "next/navigation";
import { getCurrentUser } from "./session";
import type { SessionUser } from "./types";

async function requireSessionUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Call from a Server Component before rendering a protected page. */
export const requireUserPage = requireSessionUser;

/** Call from a Server Action before performing a protected mutation. */
export const requireActionUser = requireSessionUser;
