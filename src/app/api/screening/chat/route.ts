// POST /api/screening/chat — AI chat for case review (OpenRouter)
import { NextResponse } from "next/server";
import { getChatResponse, type ChatMessage } from "@/lib/openrouter";
import type { ReviewCase } from "@/types/screening";
import {
  isScreeningConfigured,
  fetchQueueItemById as dbFetchQueue,
  fetchCustomerById as dbFetchCustomer,
  fetchSanctionsEntryById as dbFetchSanctions,
  fetchLayer2ByResultId as dbFetchLayer2,
  fetchLayer1ByCustomer as dbFetchLayer1,
} from "@/lib/screening/queries";
import {
  findQueueItem,
  findCustomer,
  findSanctionsEntry,
  findLayer2Result,
  findLayer1ByCustomer,
} from "@/lib/screening/data";

interface ChatBody {
  queue_id: string;
  messages: ChatMessage[];
}

async function buildReviewCase(queueId: string): Promise<ReviewCase | null> {
  if (isScreeningConfigured()) {
    const queue = await dbFetchQueue(queueId);
    if (!queue) return null;
    const [customer, watchlist, layer2, layer1] = await Promise.all([
      dbFetchCustomer(queue.customer_id),
      dbFetchSanctions(queue.entity_id),
      dbFetchLayer2(queue.result_id),
      dbFetchLayer1(queue.customer_id),
    ]);
    if (!customer || !watchlist || !layer2 || !layer1) return null;
    return { queue, customer, watchlist, layer1, layer2 };
  }

  // Mock mode
  const queue = findQueueItem(queueId);
  if (!queue) return null;
  const customer = findCustomer(queue.customer_id);
  const watchlist = findSanctionsEntry(queue.entity_id);
  const layer2 = findLayer2Result(queue.result_id);
  const layer1 = findLayer1ByCustomer(queue.customer_id);
  if (!customer || !watchlist || !layer2 || !layer1) return null;
  return { queue, customer, watchlist, layer1, layer2 };
}

export async function POST(request: Request) {
  try {
    const body: ChatBody = await request.json();

    if (!body.queue_id || !body.messages?.length) {
      return NextResponse.json({ error: "Missing queue_id or messages" }, { status: 400 });
    }

    const reviewCase = await buildReviewCase(body.queue_id);
    if (!reviewCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const responseText = await getChatResponse(reviewCase, body.messages);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: responseText })}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Chat failed", details: String(error) }, { status: 500 });
  }
}
