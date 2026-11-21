import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/api-auth";
import { supabase } from "@/lib/supabase";
import { runFollowUpCheck } from "@/lib/automation/run-follow-up-check";
import { logger } from "@/lib/logger";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await verifyApiAuth(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    logger.info("Cron: Running follow-up eligibility check on contacted opportunities");

    const { data: opportunities, error } = await supabase
      .from("opportunities")
      .select("id")
      .eq("stage", "contacted")
      .limit(100);

    if (error) {
      throw new Error(`Failed to load opportunities: ${error.message}`);
    }

    let checked = 0;
    let triggered = 0;

    for (const opp of opportunities ?? []) {
      checked++;
      const result = await runFollowUpCheck(opp.id);
      if (result.action === "follow_up_triggered") {
        triggered++;
      }
    }

    logger.info("Cron: Follow-up check finished", { checked, triggered });

    return NextResponse.json({
      status: "success",
      checkedCount: checked,
      triggeredCount: triggered,
    });
  } catch (err) {
    logger.error("Cron: Follow-up check failed", {
      error: err instanceof Error ? err.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Follow-up cron execution failed", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
