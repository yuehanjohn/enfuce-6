// GET /api/screening/health — System health check (mock mode)
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    connected: true,
    source: "mock",
    latency_ms: 1,
    message: "Running in mock mode — no external dependencies",
  });
}
