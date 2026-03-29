// POST /api/screening/layer2-process-one — Process a single Layer 1 flag through Layer 2
// Takes ~10 seconds per case. If routed as HUMAN_REVIEW, pushes to review queue.
import { NextResponse } from "next/server";
import {
  runtime,
  findCustomer,
  findSanctionsEntry,
  generateLayer2Result,
} from "@/lib/screening/data";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const flagId = typeof body.flag_id === "string" ? body.flag_id : "";

    if (!flagId) {
      return NextResponse.json({ error: "flag_id is required" }, { status: 400 });
    }

    const flag = runtime.layer1Flags.find((f) => f.flag_id === flagId);
    if (!flag) {
      return NextResponse.json({ error: "Flag not found" }, { status: 404 });
    }

    const customer = findCustomer(flag.customer_id);
    const sanction = findSanctionsEntry(flag.entity_id);
    if (!customer || !sanction) {
      return NextResponse.json({ error: "Customer or sanction not found" }, { status: 404 });
    }

    // Simulate AI processing time (~10 seconds)
    await sleep(10000);

    // Generate Layer 2 result
    const result = generateLayer2Result(flag, customer, sanction);

    // Store result
    runtime.layer2Results.push(result);

    // If HUMAN_REVIEW, push to queue immediately
    if (result.routing === "HUMAN_REVIEW") {
      const queueItem = {
        queue_id: `Q-${String(runtime.reviewQueue.length + 1).padStart(3, "0")}`,
        result_id: result.result_id,
        customer_id: result.customer_id,
        entity_id: result.entity_id,
        ai_confidence: result.ai_confidence,
        assigned_to: null,
        queued_at: new Date().toISOString(),
        status: "PENDING" as const,
      };
      runtime.reviewQueue.push(queueItem);
    }

    // Audit log
    runtime.auditLog.push({
      log_id: `AUDIT-L2-${Date.now()}`,
      customer_id: result.customer_id,
      layer: 2,
      event_type: `LAYER2_${result.routing}`,
      payload: {
        result_id: result.result_id,
        ai_confidence: result.ai_confidence,
        combined_score: result.combined_score,
        routing: result.routing,
      },
      analyst_id: null,
      ai_chat_transcript: null,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      result_id: result.result_id,
      routing: result.routing,
      ai_confidence: result.ai_confidence,
      combined_score: result.combined_score,
      customer_name: customer.full_name,
      queue_count: runtime.reviewQueue.length,
    });
  } catch (error) {
    console.error("Layer 2 process-one error:", error);
    return NextResponse.json(
      { error: "Failed to process case", details: String(error) },
      { status: 500 }
    );
  }
}
