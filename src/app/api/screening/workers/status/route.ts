import { NextResponse } from "next/server";
import { getSessionProgress, getWorkerSession } from "@/lib/screening/worker-state";
import { runtime } from "@/lib/screening/data";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId") ?? "";
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const session = getWorkerSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Unknown session" }, { status: 404 });
    }

    const results = runtime.layer2Results;
    const summary = {
      total: results.length,
      auto_restrict: results.filter((r) => r.routing === "AUTO_RESTRICT").length,
      auto_clear: results.filter((r) => r.routing === "AUTO_CLEAR").length,
      human_review: results.filter((r) => r.routing === "HUMAN_REVIEW").length,
    };

    return NextResponse.json({
      success: true,
      progress: getSessionProgress(session),
      summary,
      results_count: results.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch worker status", details: String(error) },
      { status: 500 }
    );
  }
}
