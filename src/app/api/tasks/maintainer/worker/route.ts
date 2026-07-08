import { NextRequest, NextResponse } from "next/server";
import { runMaintainer } from "@/lib/ai/maintainer";

/**
 * AI maintainer worker: scans for customers/quotations with no follow-up
 * pending and auto-creates one. Protected by CRON_SECRET; schedule via
 * vercel.json. Disabled unless AI_MAINTAINER_ENABLED=true.
 */
export async function GET(req: NextRequest) {
  const expectedToken = process.env.CRON_SECRET;
  if (!expectedToken) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.AI_MAINTAINER_ENABLED !== "true") {
    return NextResponse.json({
      success: true,
      skipped: "AI_MAINTAINER_ENABLED is not set to true",
    });
  }

  const dryRun = process.env.AI_MAINTAINER_DRY_RUN === "true";
  const requireReview = process.env.AI_MAINTAINER_REQUIRE_REVIEW === "true";

  try {
    const result = await runMaintainer({ dryRun, requireReview });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[AI Maintainer] Fatal error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
