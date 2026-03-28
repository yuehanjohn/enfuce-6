// GET /api/screening/queue — Return pending review queue
import { NextResponse } from "next/server";
import {
  hasSnowflakeConnection,
  fetchQueue as sfFetchQueue,
} from "@/lib/screening/snowflake-queries";
import {
  MOCK_QUEUE,
  findCustomer,
  findSanctionsEntry,
  findLayer2Result,
} from "@/lib/screening/data";

export async function GET(request: Request) {
  if (hasSnowflakeConnection()) {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? "25");
    try {
      const queue = await Promise.race([
        sfFetchQueue(limit),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Queue fetch timed out")), 12000)
        ),
      ]);
      return NextResponse.json({ queue, count: queue.length, source: "snowflake" });
    } catch (error) {
      console.error("Queue fetch error:", error);
      return NextResponse.json({ queue: [], count: 0, source: "snowflake-timeout" });
    }
  }

  // Mock mode
  const enrichedQueue = MOCK_QUEUE.filter((q) => q.status !== "DECIDED").map((q) => {
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
