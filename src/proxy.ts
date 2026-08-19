import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionSecret, SESSION_COOKIE_NAME } from "@/lib/auth/config";
import { verifySessionToken } from "@/lib/auth/token";

export async function proxy(request: NextRequest) {
  const purpose = request.headers.get("purpose")?.toLowerCase();
  if (purpose === "prefetch" || request.headers.has("next-router-prefetch")) {
    return NextResponse.next();
  }

  let secret: string;
  try {
    secret = getSessionSecret();
  } catch {
    return new NextResponse("Misconfigured server: SESSION_SECRET.", { status: 500 });
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (await verifySessionToken(token, secret)) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/|api(?:/|$)|favicon\\.ico|login(?:/|$)|invite(?:/|$)).*)"],
};
