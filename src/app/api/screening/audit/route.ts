// GET /api/screening/audit — Return audit log entries
import { NextResponse } from "next/server";
import { runtime } from "@/lib/screening/data";

export async function GET() {
  const sorted = [...runtime.auditLog].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return NextResponse.json({
    entries: sorted,
    count: sorted.length,
    decisions: runtime.decisions,
    source: "mock",
  });
}
