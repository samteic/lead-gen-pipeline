import { NextRequest, NextResponse } from "next/server";
import { runAcquisition } from "@/lib/acquisition";
import { githubAdapter } from "@/lib/sources/github-adapter";
import { verifyApiAuth } from "@/lib/api-auth";
import { rateLimit, rateLimitExceededResponse } from "@/lib/rate-limit";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const limit = rateLimit(req, "acquire", { maxRequests: 10, windowSeconds: 60 });
  if (!limit.success) {
    return rateLimitExceededResponse(limit);
  }

  const auth = await verifyApiAuth(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    await runAcquisition(githubAdapter, 5);
    return NextResponse.json({ status: "success" });
  } catch (err) {
    return NextResponse.json(
      { status: "failed", error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}