import { NextResponse } from "next/server";
import {
  buildLayer2Inputs,
  hasSnowflakeConnection,
  saveLayer2Results,
} from "@/lib/screening/snowflake-queries";
import { processCase } from "@/lib/screening/layer2";
import { buildFastPassResult, evaluateFastPass } from "@/lib/screening/policy";
import {
  getSessionProgress,
  getWorkerSession,
  markFailed,
  markProcessed,
} from "@/lib/screening/worker-state";

export async function POST(request: Request) {
  let sessionId = "";
  try {
    if (!hasSnowflakeConnection()) {
      return NextResponse.json(
        { error: "Worker mode requires Snowflake connection" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    const claimIndex = Number(body.claimIndex);

    if (!sessionId || !Number.isFinite(claimIndex)) {
      return NextResponse.json({ error: "sessionId and claimIndex are required" }, { status: 400 });
    }

    const session = getWorkerSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Unknown session" }, { status: 404 });
    }

    const idx = Math.max(0, Math.floor(claimIndex));
    const flag = session.flags[idx];
    if (!flag) {
      return NextResponse.json({ error: "Invalid claim index" }, { status: 400 });
    }

    const inputs = await buildLayer2Inputs([flag]);
    if (inputs.length === 0) {
      markFailed(session);
      markProcessed(session, idx);
      return NextResponse.json({
        success: false,
        skipped: true,
        reason: "Could not resolve customer/watchlist records for flag",
        progress: getSessionProgress(session),
      });
    }

    const fastDecision = evaluateFastPass(flag);
    const mode = fastDecision ? "fast" : "deep";
    const result = fastDecision
      ? buildFastPassResult(flag, fastDecision)
      : await processCase(inputs[0]);

    await saveLayer2Results([result], {
      clearExisting: session.resetRequested && !session.resetDone,
    });
    session.resetDone = true;

    markProcessed(session, idx);

    return NextResponse.json({
      success: true,
      mode,
      result,
      progress: getSessionProgress(session),
    });
  } catch (error) {
    const session = sessionId ? getWorkerSession(sessionId) : null;
    if (session) {
      markFailed(session);
    }
    return NextResponse.json(
      { error: "Failed to process case", details: String(error) },
      { status: 500 }
    );
  }
}
