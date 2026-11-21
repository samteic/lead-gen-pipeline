import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAuthState, CurrentUser } from "@/lib/auth";

export type ApiAuthResult =
  | { authorized: true; type: "api_key"; user?: undefined }
  | { authorized: true; type: "session"; user: CurrentUser }
  | { authorized: false; response: NextResponse };

/**
 * Timing-safe string comparison to prevent timing attacks.
 */
function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Verifies that an incoming API request is authorized.
 * Accepts either:
 * 1. Bearer token in 'Authorization: Bearer <token>' matching API_SECRET_KEY or CRON_SECRET
 * 2. 'x-api-key: <token>' matching API_SECRET_KEY or CRON_SECRET
 * 3. An active, approved Supabase session cookie (if called from the authenticated CRM frontend)
 */
export async function verifyApiAuth(req: NextRequest): Promise<ApiAuthResult> {
  const authHeader = req.headers.get("authorization");
  const apiKeyHeader = req.headers.get("x-api-key");

  let providedToken: string | null = null;
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    providedToken = authHeader.slice(7).trim();
  } else if (apiKeyHeader) {
    providedToken = apiKeyHeader.trim();
  }

  const validSecrets = [
    process.env.API_SECRET_KEY,
    process.env.CRON_SECRET,
  ].filter((s): s is string => Boolean(s && s.trim().length > 0));

  if (providedToken && validSecrets.length > 0) {
    for (const secret of validSecrets) {
      if (safeCompare(providedToken, secret)) {
        return { authorized: true, type: "api_key" };
      }
    }
  }

  // Check if caller has an active, approved user session (never allow read-only demo sandbox cookies)
  try {
    const authState = await getAuthState();
    if (authState.status === "ok" && !authState.user.isDemo) {
      return { authorized: true, type: "session", user: authState.user };
    }
  } catch {
    // Ignore and proceed to unauthorized response
  }

  return {
    authorized: false,
    response: NextResponse.json(
      {
        error: "Unauthorized",
        message: "A valid Bearer token, x-api-key, or approved user session is required.",
      },
      { status: 401 }
    ),
  };
}
