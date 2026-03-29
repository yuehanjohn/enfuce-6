// POST /api/screening/chat — AI chat for case review (mock mode)
import { NextResponse } from "next/server";
import type { ReviewCase } from "@/types/screening";
import {
  findQueueItem,
  findCustomer,
  findSanctionsEntry,
  findLayer2Result,
  findLayer1ByCustomer,
} from "@/lib/screening/data";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatBody {
  queue_id: string;
  messages: ChatMessage[];
}

function buildReviewCase(queueId: string): ReviewCase | null {
  const queue = findQueueItem(queueId);
  if (!queue) return null;
  const customer = findCustomer(queue.customer_id);
  const watchlist = findSanctionsEntry(queue.entity_id);
  const layer2 = findLayer2Result(queue.result_id);
  const layer1 = findLayer1ByCustomer(queue.customer_id);
  if (!customer || !watchlist || !layer2 || !layer1) return null;
  return { queue, customer, watchlist, layer1, layer2 };
}

function generateMockResponse(reviewCase: ReviewCase, lastMessage: string): string {
  const { customer, watchlist, layer2 } = reviewCase;
  const lowerMsg = lastMessage.toLowerCase();

  if (lowerMsg.includes("summary") || lowerMsg.includes("overview")) {
    return `**Case Summary**\n\nCustomer **${customer.full_name}** (${customer.nationality}, DOB: ${customer.dob}) was flagged against watchlist entry **${watchlist.entity_name}** (${watchlist.authority} — ${watchlist.list_name}).\n\nThe AI analysis produced a combined score of **${layer2.combined_score}%** with a confidence of ${layer2.ai_confidence}%. The case was routed as **${layer2.routing}** for human review.\n\n**Key matching signals:** ${layer2.matching_signals.join(", ")}.\n\n**Key conflicting signals:** ${layer2.conflicting_signals.length > 0 ? layer2.conflicting_signals.join(", ") : "None identified"}.`;
  }

  if (lowerMsg.includes("risk") || lowerMsg.includes("score") || lowerMsg.includes("confidence")) {
    return `The combined risk score is **${layer2.combined_score}%**, calculated as a weighted blend of the Layer 1 composite score and the Layer 2 AI confidence (${layer2.ai_confidence}%).\n\nThis places the case in the **${layer2.combined_score >= 85 ? "high" : layer2.combined_score >= 50 ? "moderate" : "low"}** risk category. The routing decision was **${layer2.routing}** based on the configured thresholds (auto-restrict >= 85, auto-clear <= 20).`;
  }

  if (
    lowerMsg.includes("recommend") ||
    lowerMsg.includes("decision") ||
    lowerMsg.includes("should")
  ) {
    return `Based on the available evidence:\n\n${layer2.matching_signals.map((s) => `- **Match:** ${s}`).join("\n")}\n${layer2.conflicting_signals.map((s) => `- **Conflict:** ${s}`).join("\n")}\n\nThe AI assessment suggests this case warrants careful review. I recommend reviewing the customer's identity documents and cross-referencing with the watchlist entry details before making a final determination.`;
  }

  if (lowerMsg.includes("source") || lowerMsg.includes("evidence") || lowerMsg.includes("search")) {
    const sources = layer2.sources.map((s) => `- [${s.label}](${s.url})`).join("\n");
    return `Here are the sources referenced in the AI analysis:\n\n${sources}\n\nThe ${watchlist.authority} designation notice is the primary authoritative source for this watchlist entry.`;
  }

  return `Regarding **${customer.full_name}** vs. **${watchlist.entity_name}**:\n\nThe Layer 2 analysis identified ${layer2.matching_signals.length} matching signal(s) and ${layer2.conflicting_signals.length} conflicting signal(s). The combined score of ${layer2.combined_score}% led to a **${layer2.routing}** routing decision.\n\n${layer2.reasoning.slice(0, 300)}…\n\nWould you like me to elaborate on a specific aspect of this case — the scoring breakdown, source evidence, or risk assessment?`;
}

export async function POST(request: Request) {
  try {
    const body: ChatBody = await request.json();

    if (!body.queue_id || !body.messages?.length) {
      return NextResponse.json({ error: "Missing queue_id or messages" }, { status: 400 });
    }

    const reviewCase = buildReviewCase(body.queue_id);
    if (!reviewCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const lastMessage = body.messages[body.messages.length - 1];
    const responseText = generateMockResponse(reviewCase, lastMessage.content);

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
