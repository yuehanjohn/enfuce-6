// POST /api/screening/run — Trigger Layer 1 deterministic screening
import { NextResponse } from "next/server";
import { runLayer1Screening } from "@/lib/screening/layer1";
import {
  MOCK_CUSTOMERS,
  MOCK_SANCTIONS,
  MOCK_LAYER1_FLAGS,
  auditLog,
} from "@/lib/screening/data";

export async function POST() {
  try {
    // In production: run Snowflake SQL query
    // In demo: run TypeScript scoring logic against mock data
    const flags = runLayer1Screening(MOCK_CUSTOMERS, MOCK_SANCTIONS);

    // Log to audit
    auditLog.push({
      log_id: `AUDIT-L1-${Date.now()}`,
      customer_id: "BATCH",
      layer: 1,
      event_type: "LAYER1_SCREENING_COMPLETE",
      payload: {
        customers_screened: MOCK_CUSTOMERS.length,
        sanctions_entries: MOCK_SANCTIONS.length,
        flags_produced: flags.length,
      },
      analyst_id: null,
      ai_chat_transcript: null,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      customers_screened: MOCK_CUSTOMERS.length,
      sanctions_entries: MOCK_SANCTIONS.length,
      flags: flags.length > 0 ? flags : MOCK_LAYER1_FLAGS,
      flags_count: flags.length > 0 ? flags.length : MOCK_LAYER1_FLAGS.length,
    });
  } catch (error) {
    console.error("Layer 1 screening error:", error);
    return NextResponse.json(
      { error: "Layer 1 screening failed", details: String(error) },
      { status: 500 },
    );
  }
}

export async function GET() {
  // Return current Layer 1 flags
  return NextResponse.json({
    flags: MOCK_LAYER1_FLAGS,
    count: MOCK_LAYER1_FLAGS.length,
  });
}
