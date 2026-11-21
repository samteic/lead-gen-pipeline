import { NextRequest, NextResponse } from "next/server";
import { DEMO_COOKIE_NAME, isDemoEnabled, safeDemoDestination } from "@/lib/demo";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const exit = req.nextUrl.searchParams.get("exit") === "1";

  if (exit) {
    const response = NextResponse.redirect(new URL("/", req.url));
    response.cookies.set(DEMO_COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return response;
  }

  if (!isDemoEnabled()) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const destination = safeDemoDestination(req.nextUrl.searchParams.get("to"));
  const response = NextResponse.redirect(new URL(destination, req.url));
  response.cookies.set(DEMO_COOKIE_NAME, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return response;
}
