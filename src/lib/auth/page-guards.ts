import { redirect } from "next/navigation";
import { getCurrentUser } from "./session";
import type { SessionUser } from "./types";

export async function requireUserPage(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
