// GET /api/screening/review?id=Q-001 — Get full review case by queue ID
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import type { ReviewCase } from "@/types/screening";
import {
  findQueueItem,
  findCustomer,
  findSanctionsEntry,
  findLayer2Result,
  findLayer1ByCustomer,
} from "@/lib/screening/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
  }

  const queue = findQueueItem(id);
  if (!queue) return NextResponse.json({ error: "Queue item not found" }, { status: 404 });

  const customer = findCustomer(queue.customer_id);
  const watchlist = findSanctionsEntry(queue.entity_id);
  const layer2 = findLayer2Result(queue.result_id);
  const layer1 = findLayer1ByCustomer(queue.customer_id);

  if (!customer || !watchlist || !layer2 || !layer1) {
    return NextResponse.json({ error: "Incomplete case data" }, { status: 404 });
  }

  const reviewCase: ReviewCase = { queue, customer, watchlist, layer1, layer2 };
  return NextResponse.json(reviewCase);
}
