import { NextResponse } from "next/server";
import {
  fetchLayer2Results,
  hasSnowflakeConnection,
  runLayer2Processing,
} from "@/lib/screening/snowflake-queries";
import { getSessionProgress, getWorkerSession } from "@/lib/screening/worker-state";

export async function GET(request: Request) {
  try {
    if (!hasSnowflakeConnection()) {
      return NextResponse.json(
        { error: "Worker mode requires Snowflake connection" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId") ?? "";
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const session = getWorkerSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Unknown session" }, { status: 404 });
    }

    const [summary, results] = await Promise.all([runLayer2Processing(), fetchLayer2Results()]);

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
