import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEMO_COOKIE_NAME, isDemoEnabled } from "@/lib/demo";

const PROTECTED_PREFIXES = ["/crm"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

  const hasSandboxCookie = isDemoEnabled() && request.cookies.get(DEMO_COOKIE_NAME)?.value === "1";

  let signedIn = false;
  if (process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY) {
    const supabaseAuth = createServerClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers?: Record<string, string>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    });

    // Refreshes an expired session and writes the new cookies onto `response`.
    // Do not put code between creating the client and this call.
    const { data } = await supabaseAuth.auth.getClaims();
    signedIn = Boolean(data?.claims?.sub);
  }

  if (isProtected && !signedIn && !hasSandboxCookie) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/crm/:path*"],
};
