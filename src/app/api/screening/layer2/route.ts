// POST /api/screening/layer2 — Trigger Layer 2 AI processing
// GET /api/screening/layer2 — Return cached Layer 2 results
import { NextResponse } from "next/server";
import { processCase } from "@/lib/screening/layer2";
import {
  MOCK_LAYER1_FLAGS,
  MOCK_LAYER2_RESULTS,
  MOCK_QUEUE,
  findCustomer,
  findSanctionsEntry,
  auditLog,
} from "@/lib/screening/data";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const useMock = body.mock !== false;

    if (useMock) {
      // Return pre-computed mock results for demo
      for (const result of MOCK_LAYER2_RESULTS) {
        auditLog.push({
          log_id: `AUDIT-L2-${result.result_id}-${Date.now()}`,
          customer_id: result.customer_id,
          layer: 2,
          event_type: `LAYER2_${result.routing}`,
          payload: {
            result_id: result.result_id,
            ai_confidence: result.ai_confidence,
            routing: result.routing,
          },
          analyst_id: null,
          ai_chat_transcript: null,
          created_at: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        success: true,
        results: MOCK_LAYER2_RESULTS,
        summary: {
          total: MOCK_LAYER2_RESULTS.length,
          auto_restrict: MOCK_LAYER2_RESULTS.filter((r) => r.routing === "AUTO_RESTRICT").length,
          auto_clear: MOCK_LAYER2_RESULTS.filter((r) => r.routing === "AUTO_CLEAR").length,
          human_review: MOCK_LAYER2_RESULTS.filter((r) => r.routing === "HUMAN_REVIEW").length,
        },
      });
    }

    // Live mode: process with Snowflake Cortex
    const results = [];
    for (const flag of MOCK_LAYER1_FLAGS) {
      const customer = findCustomer(flag.customer_id);
      const sanctions = findSanctionsEntry(flag.entity_id);
      if (!customer || !sanctions) continue;

      const result = await processCase({ customer, sanctions, flag });
      results.push(result);

      // Add to queue if human review
      if (result.routing === "HUMAN_REVIEW") {
        MOCK_QUEUE.push({
          queue_id: `Q-${Date.now()}-${result.customer_id}`,
          result_id: result.result_id,
          customer_id: result.customer_id,
          entity_id: result.entity_id,
          ai_confidence: result.ai_confidence,
          assigned_to: null,
          queued_at: new Date().toISOString(),
          status: "PENDING",
        });
      }

      auditLog.push({
        log_id: `AUDIT-L2-${result.result_id}-${Date.now()}`,
        customer_id: result.customer_id,
        layer: 2,
        event_type: `LAYER2_${result.routing}`,
        payload: {
          result_id: result.result_id,
          ai_confidence: result.ai_confidence,
          routing: result.routing,
        },
        analyst_id: null,
        ai_chat_transcript: null,
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: results.length,
        auto_restrict: results.filter((r) => r.routing === "AUTO_RESTRICT").length,
        auto_clear: results.filter((r) => r.routing === "AUTO_CLEAR").length,
        human_review: results.filter((r) => r.routing === "HUMAN_REVIEW").length,
      },
    });
  } catch (error) {
    console.error("Layer 2 processing error:", error);
    return NextResponse.json(
      { error: "Layer 2 processing failed", details: String(error) },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    results: MOCK_LAYER2_RESULTS,
    count: MOCK_LAYER2_RESULTS.length,
  });
}
