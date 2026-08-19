import { NextResponse } from "next/server";
import { getCurrentUser } from "./session";
import type { SessionUser } from "./types";

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function requireUser(): Promise<SessionUser | NextResponse> {
  return (await getCurrentUser()) ?? unauthorized();
}
