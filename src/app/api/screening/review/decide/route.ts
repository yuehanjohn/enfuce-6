// POST /api/screening/review/decide — Submit analyst decision
import { NextResponse } from "next/server";
import { runtime } from "@/lib/screening/data";

interface DecisionBody {
  queue_id: string;
  decision: "APPROVE" | "REJECT";
  reason_category: string;
  analyst_note: string;
  chat_transcript?: string;
}

export async function POST(request: Request) {
  try {
    const body: DecisionBody = await request.json();

    if (!body.queue_id || !body.decision || !body.reason_category || !body.analyst_note) {
      return NextResponse.json(
        { error: "Missing required fields: queue_id, decision, reason_category, analyst_note" },
        { status: 400 }
      );
    }

    if (body.analyst_note.length < 10) {
      return NextResponse.json(
        { error: "Analyst note must be at least 10 characters" },
        { status: 400 }
      );
    }

    const queueItem = runtime.reviewQueue.find((q) => q.queue_id === body.queue_id);
    if (!queueItem) return NextResponse.json({ error: "Queue item not found" }, { status: 404 });

    queueItem.status = "DECIDED";

    const decision = {
      decision_id: `DEC-${Date.now()}`,
      customer_id: queueItem.customer_id,
      result_id: queueItem.result_id,
      trigger_type: "HUMAN" as const,
      analyst_id: "analyst-demo",
      reason_category: body.reason_category,
      analyst_note: body.analyst_note,
      decided_at: new Date().toISOString(),
    };

    runtime.decisions.push(decision);

    runtime.auditLog.push({
      log_id: `AUDIT-L3-${Date.now()}`,
      customer_id: queueItem.customer_id,
      layer: 3,
      event_type: body.decision === "APPROVE" ? "HUMAN_CLEARED" : "HUMAN_RESTRICTED",
      payload: {
        decision_id: decision.decision_id,
        decision: body.decision,
        reason_category: body.reason_category,
        analyst_note: body.analyst_note,
        ai_confidence: queueItem.ai_confidence,
      },
      analyst_id: "analyst-demo",
      ai_chat_transcript: body.chat_transcript ?? null,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, decision, source: "mock" });
  } catch (error) {
    console.error("Decision submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit decision", details: String(error) },
      { status: 500 }
    );
  }
}
