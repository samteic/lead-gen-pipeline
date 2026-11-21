import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/api-auth";
import { pruneStaleContacts, loadRetentionReport } from "@/lib/compliance/retention";
import { logger } from "@/lib/logger";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await verifyApiAuth(req);
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    logger.info("Cron: Running automated retention check and pruning");
    const reportBefore = await loadRetentionReport();
    const pruneResult = await pruneStaleContacts("cron_retention", 100);

    return NextResponse.json({
      status: "success",
      retentionSummary: {
        totalEligibleBefore: reportBefore.totalEligible,
        staleUncontacted: reportBefore.staleUncontactedCount,
        unsubscribedEligible: reportBefore.unsubscribedRetentionCount,
        prunedThisRun: pruneResult.ok ? pruneResult.prunedCount : 0,
      },
      message: pruneResult.ok ? pruneResult.message : pruneResult.error,
    });
  } catch (err) {
    logger.error("Cron: Retention pruning failed", {
      error: err instanceof Error ? err.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Retention cron execution failed", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
