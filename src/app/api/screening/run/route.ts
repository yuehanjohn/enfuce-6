// POST /api/screening/run — Trigger Layer 1 deterministic screening
// GET /api/screening/run — Return current Layer 1 flags
import { NextResponse } from "next/server";
import { runLayer1Screening } from "@/lib/screening/layer1";
import {
  isScreeningConfigured,
  runLayer1Screening as dbRunLayer1,
  fetchLayer1Flags as dbFetchFlags,
} from "@/lib/screening/queries";
import { MOCK_CUSTOMERS, MOCK_SANCTIONS, MOCK_LAYER1_FLAGS, auditLog } from "@/lib/screening/data";

export async function POST() {
  try {
    if (isScreeningConfigured()) {
      const { flagCount, customerCount } = await dbRunLayer1();
      const flags = await dbFetchFlags();
      return NextResponse.json({
        success: true,
        customers_screened: customerCount,
        sanctions_entries: 0,
        flags,
        flags_count: flagCount,
        source: "supabase",
      });
    }

    // Mock mode
    const flags = runLayer1Screening(MOCK_CUSTOMERS, MOCK_SANCTIONS);

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
      source: "mock",
    });
  } catch (error) {
    console.error("Layer 1 screening error:", error);
    return NextResponse.json(
      { error: "Layer 1 screening failed", details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  if (isScreeningConfigured()) {
    const flags = await dbFetchFlags();
    return NextResponse.json({ flags, count: flags.length, source: "supabase" });
  }
  return NextResponse.json({
    flags: MOCK_LAYER1_FLAGS,
    count: MOCK_LAYER1_FLAGS.length,
    source: "mock",
  });
}
