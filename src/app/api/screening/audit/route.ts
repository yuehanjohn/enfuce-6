// GET /api/screening/audit — Return audit log entries
import { NextResponse } from "next/server";
import { isScreeningConfigured, fetchAuditLog as dbFetchAudit } from "@/lib/screening/queries";
import { auditLog, decisions, MOCK_LAYER2_RESULTS } from "@/lib/screening/data";

export async function GET() {
  if (isScreeningConfigured()) {
    const entries = await dbFetchAudit();
    return NextResponse.json({ entries, count: entries.length, decisions: [], source: "supabase" });
  }

  // Mock mode — combine seeded + runtime entries
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
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return NextResponse.json({
    entries: allEntries,
    count: allEntries.length,
    decisions,
    source: "mock",
  });
}
