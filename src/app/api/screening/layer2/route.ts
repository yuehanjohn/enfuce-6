// POST /api/screening/layer2 — Return Layer 2 results summary
// GET  /api/screening/layer2 — Return stored Layer 2 results
import { NextResponse } from "next/server";
import { runtime } from "@/lib/screening/data";

export async function POST() {
  const results = runtime.layer2Results;
  const summary = {
    total: results.length,
    auto_restrict: results.filter((r) => r.routing === "AUTO_RESTRICT").length,
    auto_clear: results.filter((r) => r.routing === "AUTO_CLEAR").length,
    human_review: results.filter((r) => r.routing === "HUMAN_REVIEW").length,
  };

  return NextResponse.json({
    success: true,
    results,
    summary,
    source: "mock",
  });
}

export async function GET() {
  return NextResponse.json({
    results: runtime.layer2Results,
    count: runtime.layer2Results.length,
    source: "mock",
  });
}
