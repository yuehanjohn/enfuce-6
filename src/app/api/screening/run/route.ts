// POST /api/screening/run — Trigger Layer 1 deterministic screening
// Screens 10,000 customers against sanctions watchlist in ~500ms
import { NextResponse } from "next/server";
import { runLayer1Screening } from "@/lib/screening/layer1";
import { getCustomers, MOCK_SANCTIONS, runtime } from "@/lib/screening/data";

export async function POST() {
  try {
    const customers = getCustomers();
    const flags = runLayer1Screening(customers, MOCK_SANCTIONS);

    // Store flags in runtime state
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

    return NextResponse.json({
      success: true,
      customers_screened: customers.length,
      sanctions_entries: MOCK_SANCTIONS.length,
      flags: flags,
      flags_count: flags.length,
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
  return NextResponse.json({
    flags: runtime.layer1Flags,
    count: runtime.layer1Flags.length,
    source: "mock",
  });
}
