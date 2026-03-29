// POST /api/screening/activate — Kick off full pipeline server-side
// GET  /api/screening/activate — Poll activation status
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import {
  runtime,
  getCustomers,
  MOCK_SANCTIONS,
  findCustomer,
  findSanctionsEntry,
  generateLayer2Result,
} from "@/lib/screening/data";
import { runLayer1Screening } from "@/lib/screening/layer1";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runPipeline() {
  try {
    // Stage: server boot
    runtime.stage = "server";
    await sleep(1200);

    // Stage: Layer 1
    runtime.stage = "layer1";
    const customers = getCustomers();
    const flags = runLayer1Screening(customers, MOCK_SANCTIONS);
    runtime.layer1Flags = flags;

    runtime.auditLog.push({
      log_id: `AUDIT-L1-${Date.now()}`,
      customer_id: "BATCH",
      layer: 1,
      event_type: "LAYER1_SCREENING_COMPLETE",
      payload: {
        customers_screened: customers.length,
        sanctions_entries: MOCK_SANCTIONS.length,
        flags_produced: flags.length,
      },
      analyst_id: null,
      ai_chat_transcript: null,
      created_at: new Date().toISOString(),
    });

    // Stage: Layer 2 — process one-by-one with 10s delay
    runtime.stage = "layer2";
    runtime.layer2Total = flags.length;
    runtime.layer2Done = 0;

    for (let i = 0; i < flags.length; i++) {
      const flag = flags[i];
      const customer = findCustomer(flag.customer_id);
      const sanction = findSanctionsEntry(flag.entity_id);
      if (!customer || !sanction) continue;

      await sleep(10000);

      const result = generateLayer2Result(flag, customer, sanction);
      runtime.layer2Results.push(result);

      if (result.routing === "HUMAN_REVIEW") {
        runtime.reviewQueue.push({
          queue_id: `Q-${String(runtime.reviewQueue.length + 1).padStart(3, "0")}`,
          result_id: result.result_id,
          customer_id: result.customer_id,
          entity_id: result.entity_id,
          ai_confidence: result.ai_confidence,
          assigned_to: null,
          queued_at: new Date().toISOString(),
          status: "PENDING" as const,
        });
      }

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

      runtime.layer2Done = i + 1;
    }

    runtime.stage = "active";
    runtime.activated = true;
  } catch (err) {
    console.error("Pipeline failed:", err);
    runtime.stage = "idle";
  }
}

export async function POST() {
  if (runtime.stage !== "idle") {
    return NextResponse.json({ error: "Already running", stage: runtime.stage }, { status: 409 });
  }

  // Fire and forget — don't await, let it run in background
  runPipeline();

  return NextResponse.json({ success: true, message: "Pipeline started" });
}

export async function GET() {
  return NextResponse.json({
    stage: runtime.stage,
    layer2Done: runtime.layer2Done,
    layer2Total: runtime.layer2Total,
    queueCount: runtime.reviewQueue.length,
    flagsCount: runtime.layer1Flags.length,
  });
}
