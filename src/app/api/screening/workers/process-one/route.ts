import { NextResponse } from "next/server";
import { getSessionProgress, getWorkerSession, markProcessed } from "@/lib/screening/worker-state";
import {
  runtime,
  findCustomer,
  findSanctionsEntry,
  generateLayer2Result,
} from "@/lib/screening/data";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
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

    const customer = findCustomer(flag.customer_id);
    const sanction = findSanctionsEntry(flag.entity_id);
    if (!customer || !sanction) {
      markProcessed(session, idx);
      return NextResponse.json({
        success: false,
        skipped: true,
        progress: getSessionProgress(session),
      });
    }

    const result = generateLayer2Result(flag, customer, sanction);
    runtime.layer2Results.push(result);

    const mode = result.combined_score >= 85 ? "fast" : "deep";
    markProcessed(session, idx);

    return NextResponse.json({
      success: true,
      mode,
      result,
      progress: getSessionProgress(session),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process case", details: String(error) },
      { status: 500 }
    );
  }
}
