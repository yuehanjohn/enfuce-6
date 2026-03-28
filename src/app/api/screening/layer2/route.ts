// POST /api/screening/layer2 — Trigger Layer 2 AI processing
// GET /api/screening/layer2 — Return Layer 2 results
import { NextResponse } from "next/server";
import {
  isScreeningConfigured,
  runLayer2Processing as dbRunLayer2,
  fetchLayer2Results as dbFetchResults,
} from "@/lib/screening/queries";
import { MOCK_LAYER2_RESULTS, auditLog } from "@/lib/screening/data";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const useMock = body.mock !== false;

    // Real Supabase + OpenRouter mode
    if (isScreeningConfigured() && !useMock) {
      const summary = await dbRunLayer2();
      const results = await dbFetchResults();
      return NextResponse.json({
        success: true,
        results,
        summary,
        source: "supabase",
      });
    }

    // Mock mode — return pre-computed results
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
      source: "mock",
    });
  } catch (error) {
    console.error("Layer 2 processing error:", error);
    return NextResponse.json(
      { error: "Layer 2 processing failed", details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  if (isScreeningConfigured()) {
    const results = await dbFetchResults();
    return NextResponse.json({ results, count: results.length, source: "supabase" });
  }
  return NextResponse.json({
    results: MOCK_LAYER2_RESULTS,
    count: MOCK_LAYER2_RESULTS.length,
    source: "mock",
  });
}
