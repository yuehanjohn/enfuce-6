// POST /api/screening/chat — AI chat for case review (Snowflake Cortex)
import { NextResponse } from "next/server";
import { getChatResponse, type ChatMessage } from "@/lib/cortex";
import type { ReviewCase } from "@/types/screening";
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

export async function POST(request: Request) {
  try {
    const body: ChatBody = await request.json();

    if (!body.queue_id || !body.messages?.length) {
      return NextResponse.json(
        { error: "Missing queue_id or messages" },
        { status: 400 },
      );
    }

    const queue = findQueueItem(body.queue_id);
    if (!queue) {
      return NextResponse.json({ error: "Queue item not found" }, { status: 404 });
    }

    const customer = findCustomer(queue.customer_id);
    const watchlist = findSanctionsEntry(queue.entity_id);
    const layer2 = findLayer2Result(queue.result_id);
    const layer1 = findLayer1ByCustomer(queue.customer_id);

    if (!customer || !watchlist || !layer2 || !layer1) {
      return NextResponse.json({ error: "Incomplete case data" }, { status: 404 });
    }

    const reviewCase: ReviewCase = { queue, customer, watchlist, layer1, layer2 };

    const responseText = await getChatResponse(reviewCase, body.messages);

    // Send as SSE format for compatibility with the frontend streaming handler
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Send the full response as a single chunk
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ text: responseText })}\n\n`),
        );
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
    return NextResponse.json(
      { error: "Chat failed", details: String(error) },
      { status: 500 },
    );
  }
}
