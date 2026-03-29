// GET /api/screening/queue — Return pending review queue (live, grows during Layer 2)
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { runtime, findCustomer, findSanctionsEntry, findLayer2Result } from "@/lib/screening/data";

export async function GET() {
  const enrichedQueue = runtime.reviewQueue
    .filter((q) => q.status !== "DECIDED")
    .map((q) => {
      const customer = findCustomer(q.customer_id);
      const watchlist = findSanctionsEntry(q.entity_id);
      const layer2 = findLayer2Result(q.result_id);
      return {
        ...q,
        customer_name: customer?.full_name ?? "Unknown",
        customer_nationality: customer?.nationality ?? "",
        customer_dob: customer?.dob ?? "",
        entity_name: watchlist?.entity_name ?? "Unknown",
        list_source: watchlist ? `${watchlist.authority} - ${watchlist.list_name}` : "",
        reasoning_summary: layer2?.reasoning?.slice(0, 150) ?? "",
      };
    });

  return NextResponse.json({ queue: enrichedQueue, count: enrichedQueue.length, source: "mock" });
}
