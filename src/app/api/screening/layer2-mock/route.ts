// POST /api/screening/layer2-mock — Batch process all Layer 1 flags (legacy endpoint)
import { NextResponse } from "next/server";
import {
  runtime,
  findCustomer,
  findSanctionsEntry,
  generateLayer2Result,
} from "@/lib/screening/data";

export async function POST() {
  let autoRestrict = 0;
  let autoClear = 0;
  let humanReview = 0;

  for (const flag of runtime.layer1Flags) {
    const customer = findCustomer(flag.customer_id);
    const sanction = findSanctionsEntry(flag.entity_id);
    if (!customer || !sanction) continue;

    const result = generateLayer2Result(flag, customer, sanction);
    runtime.layer2Results.push(result);

    if (result.routing === "AUTO_RESTRICT") autoRestrict++;
    else if (result.routing === "AUTO_CLEAR") autoClear++;
    else {
      humanReview++;
      runtime.reviewQueue.push({
        queue_id: `Q-${String(runtime.reviewQueue.length + 1).padStart(3, "0")}`,
        result_id: result.result_id,
        customer_id: result.customer_id,
        entity_id: result.entity_id,
        ai_confidence: result.ai_confidence,
        assigned_to: null,
        queued_at: new Date().toISOString(),
        status: "PENDING",
      });
    }
  }

  return NextResponse.json({
    success: true,
    total: runtime.layer1Flags.length,
    auto_restrict: autoRestrict,
    auto_clear: autoClear,
    human_review_count: humanReview,
    queue_ids: runtime.reviewQueue.map((q) => q.queue_id),
    source: "mock",
  });
}
