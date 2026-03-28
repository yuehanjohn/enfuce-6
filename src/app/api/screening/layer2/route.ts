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
import { SCREENING_CONFIG } from "@/lib/screening/config";

function log(step: string, data?: unknown) {
  const ts = new Date().toISOString();
  if (data !== undefined) {
    console.log(`[Layer2 API] ${ts} | ${step}`, data);
  } else {
    console.log(`[Layer2 API] ${ts} | ${step}`);
  }
}

export async function POST(request: Request) {
  const requestStart = Date.now();
  log("POST /api/screening/layer2 — START");

  try {
    const body = await request.json().catch(() => ({}));
    const useMock = typeof body.mock === "boolean" ? body.mock : !hasSnowflakeConnection();

    log("Config", {
      useMock,
      hasSnowflake: hasSnowflakeConnection(),
      config: {
        model: SCREENING_CONFIG.layer2.model,
        concurrency: SCREENING_CONFIG.layer2.concurrency,
        searchMaxResults: SCREENING_CONFIG.layer2.searchMaxResults,
        autoRestrictThreshold: SCREENING_CONFIG.routing.autoRestrictThreshold,
        autoClearThreshold: SCREENING_CONFIG.routing.autoClearThreshold,
        layer1Weight: SCREENING_CONFIG.scoring.layer1Weight,
        layer2Weight: SCREENING_CONFIG.scoring.layer2Weight,
        layer1MaxScore: SCREENING_CONFIG.scoring.layer1MaxScore,
      },
    });

    // ── Real Snowflake mode ──────────────────────────────────────────
    if (hasSnowflakeConnection() && !useMock) {
      // 1. Fetch Layer 1 flags
      log("Step 1 — fetchLayer1Flags START");
      const t1 = Date.now();
      const flags = await fetchLayer1Flags();
      log(`Step 1 — fetchLayer1Flags DONE (${Date.now() - t1}ms)`, {
        count: flags.length,
        flags: flags.map((f) => ({
          flag_id: f.flag_id,
          customer_id: f.customer_id,
          entity_id: f.entity_id,
          composite_score: f.composite_score,
        })),
      });

      if (flags.length === 0) {
        log("No Layer 1 flags found — aborting Layer 2");
        return NextResponse.json({
          success: true,
          results: [],
          summary: { total: 0, auto_restrict: 0, auto_clear: 0, human_review: 0 },
          message: "No Layer 1 flags found. Run Layer 1 screening first.",
          source: "snowflake",
        });
      }

      // 2. Resolve customer + sanctions records for each flag
      log(`Step 2 — buildLayer2Inputs START (${flags.length} flags)`);
      const t2 = Date.now();
      const inputs = await buildLayer2Inputs(flags);
      log(`Step 2 — buildLayer2Inputs DONE (${Date.now() - t2}ms)`, {
        resolved: inputs.length,
        skipped: flags.length - inputs.length,
        cases: inputs.map((i) => ({
          flag_id: i.flag.flag_id,
          customer: i.customer.full_name,
          sanctions: i.sanctions.entity_name,
          layer1_score: i.flag.composite_score,
        })),
      });

      // 3. Run AI processing: 2× Brave Search + Cortex COMPLETE per case
      log(
        `Step 3 — processBatch START (${inputs.length} cases, concurrency=${SCREENING_CONFIG.layer2.concurrency})`
      );
      const t3 = Date.now();
      const results = await processBatch(inputs);
      log(`Step 3 — processBatch DONE (${Date.now() - t3}ms)`, {
        processed: results.length,
        routing: {
          AUTO_RESTRICT: results.filter((r) => r.routing === "AUTO_RESTRICT").length,
          AUTO_CLEAR: results.filter((r) => r.routing === "AUTO_CLEAR").length,
          HUMAN_REVIEW: results.filter((r) => r.routing === "HUMAN_REVIEW").length,
        },
        scores: results.map((r) => ({
          flag_id: r.flag_id,
          customer_id: r.customer_id,
          ai_confidence: r.ai_confidence,
          combined_score: r.combined_score,
          routing: r.routing,
        })),
      });

      // 4. Persist results + handle auto routing
      log("Step 4 — saveLayer2Results START");
      const t4 = Date.now();
      await saveLayer2Results(results);
      log(`Step 4 — saveLayer2Results DONE (${Date.now() - t4}ms)`);

      // 5. Read back authoritative summary
      log("Step 5 — runLayer2Processing (summary query)");
      const summary = await runLayer2Processing();
      const allResults = await sfFetchResults();

      const totalMs = Date.now() - requestStart;
      log(`POST DONE (${totalMs}ms)`, { summary });

      return NextResponse.json({
        success: true,
        results: allResults,
        summary,
        source: "snowflake",
      });
    }

    // ── Mock mode ────────────────────────────────────────────────────
    log("Using mock data (Snowflake not connected or mock forced)");

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

    const mockSummary = {
      total: MOCK_LAYER2_RESULTS.length,
      auto_restrict: MOCK_LAYER2_RESULTS.filter((r) => r.routing === "AUTO_RESTRICT").length,
      auto_clear: MOCK_LAYER2_RESULTS.filter((r) => r.routing === "AUTO_CLEAR").length,
      human_review: MOCK_LAYER2_RESULTS.filter((r) => r.routing === "HUMAN_REVIEW").length,
    };

    log(`POST DONE — mock (${Date.now() - requestStart}ms)`, mockSummary);

    return NextResponse.json({
      success: true,
      results: MOCK_LAYER2_RESULTS,
      summary: mockSummary,
      source: "mock",
    });
  } catch (error) {
    const totalMs = Date.now() - requestStart;
    log(`POST ERROR (${totalMs}ms)`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.split("\n").slice(0, 5) : undefined,
    });
    console.error("Layer 2 processing error:", error);
    return NextResponse.json(
      { error: "Layer 2 processing failed", details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  if (hasSnowflakeConnection()) {
    log("GET — fetching from Snowflake");
    const results = await sfFetchResults();
    log("GET — done", { count: results.length });
    return NextResponse.json({ results, count: results.length, source: "snowflake" });
  }
  log("GET — returning mock data");
  return NextResponse.json({
    results: MOCK_LAYER2_RESULTS,
    count: MOCK_LAYER2_RESULTS.length,
    source: "mock",
  });
}
