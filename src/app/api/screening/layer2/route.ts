// POST /api/screening/layer2 — Run Layer 2 AI processing pipeline
// GET  /api/screening/layer2 — Return stored Layer 2 results
import { NextResponse } from "next/server";
import {
  hasSnowflakeConnection,
  fetchLayer1Flags,
  buildLayer2Inputs,
  saveLayer2Results,
  runLayer2Processing,
  fetchLayer2Results as sfFetchResults,
} from "@/lib/screening/snowflake-queries";
import { processBatch } from "@/lib/screening/layer2";
import { MOCK_LAYER2_RESULTS, auditLog } from "@/lib/screening/data";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const useMock = typeof body.mock === "boolean" ? body.mock : !hasSnowflakeConnection();

    // ── Real Snowflake mode ──────────────────────────────────────────
    if (hasSnowflakeConnection() && !useMock) {
      // 1. Fetch all Layer 1 flags
      const flags = await fetchLayer1Flags();
      if (flags.length === 0) {
        return NextResponse.json({
          success: true,
          results: [],
          summary: { total: 0, auto_restrict: 0, auto_clear: 0, human_review: 0 },
          message: "No Layer 1 flags found. Run Layer 1 screening first.",
          source: "snowflake",
        });
      }

      // 2. Resolve customer + sanctions data for each flag
      const inputs = await buildLayer2Inputs(flags);

      // 3. Run AI processing (Cortex COMPLETE + dual Brave Search per case)
      const results = await processBatch(inputs);

      // 4. Persist results + handle auto routing (restrict/clear/queue)
      await saveLayer2Results(results);

      // 5. Return summary from database (authoritative count after writes)
      const summary = await runLayer2Processing();
      const allResults = await sfFetchResults();

      return NextResponse.json({
        success: true,
        results: allResults,
        summary,
        source: "snowflake",
      });
    }

    // ── Mock mode ────────────────────────────────────────────────────
    for (const result of MOCK_LAYER2_RESULTS) {
      auditLog.push({
        log_id: `AUDIT-L2-${result.result_id}-${Date.now()}`,
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
  if (hasSnowflakeConnection()) {
    const results = await sfFetchResults();
    return NextResponse.json({ results, count: results.length, source: "snowflake" });
  }
  return NextResponse.json({
    results: MOCK_LAYER2_RESULTS,
    count: MOCK_LAYER2_RESULTS.length,
    source: "mock",
  });
}
