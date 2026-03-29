import { NextResponse } from "next/server";
import {
  createWorkerSession,
  getSessionProgress,
  getWorkerSession,
  claimNextIndex,
} from "@/lib/screening/worker-state";
import { runtime } from "@/lib/screening/data";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const requestedSessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    const requestedMaxCases = Number(body.maxCases);
    const maxCases = Number.isFinite(requestedMaxCases)
      ? Math.max(1, Math.min(500, Math.floor(requestedMaxCases)))
      : 300;
    const reset = body.reset === true;

    let session = requestedSessionId ? getWorkerSession(requestedSessionId) : null;

    if (!session || reset) {
      session = createWorkerSession(runtime.layer1Flags, maxCases, reset);
    }

    const claimIndex = claimNextIndex(session);
    const progress = getSessionProgress(session);

    if (claimIndex === null) {
      return NextResponse.json({
        success: true,
        sessionId: session.sessionId,
        claim: null,
        progress,
      });
    }

    const flag = session.flags[claimIndex];
    return NextResponse.json({
      success: true,
      sessionId: session.sessionId,
      claim: {
        index: claimIndex,
        flag_id: flag.flag_id,
        customer_id: flag.customer_id,
        entity_id: flag.entity_id,
      },
      progress,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to claim next case", details: String(error) },
      { status: 500 }
    );
  }
}
