// GET /api/screening/audit — Return audit log entries
import { NextResponse } from "next/server";
import { auditLog, decisions } from "@/lib/screening/data";
import { MOCK_LAYER2_RESULTS } from "@/lib/screening/data";

export async function GET() {
  // Combine auto-decisions from Layer 2 with human decisions from Layer 3
  // Include pre-seeded audit entries for demo
  const seededEntries = MOCK_LAYER2_RESULTS.map((r) => ({
    log_id: `AUDIT-SEED-${r.result_id}`,
    customer_id: r.customer_id,
    layer: 2 as const,
    event_type: `LAYER2_${r.routing}`,
    payload: {
      result_id: r.result_id,
      ai_confidence: r.ai_confidence,
      routing: r.routing,
      reasoning: r.reasoning.slice(0, 200),
    },
    analyst_id: null,
    ai_chat_transcript: null,
    created_at: r.processed_at,
  }));

  const allEntries = [...seededEntries, ...auditLog].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return NextResponse.json({
    entries: allEntries,
    count: allEntries.length,
    decisions: decisions,
  });
}
