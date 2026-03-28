// OpenRouter API client — replaces Snowflake Cortex for LLM calls
// Uses OpenAI-compatible chat completions API

import { brightDataSearch, type SearchResult } from "./brightdata";
import type { ReviewCase } from "@/types/screening";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

function getApiKey(): string {
  return process.env.OPENROUTER_API_KEY ?? "";
}

function getModel(): string {
  return process.env.OPENROUTER_MODEL ?? "anthropic/claude-sonnet-4";
}

export function isOpenRouterConfigured(): boolean {
  return !!getApiKey();
}

// ── LLM Complete ───────────────────────────────────────────────────

interface CompleteOptions {
  model?: string;
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export async function openrouterComplete({
  model,
  systemPrompt,
  userPrompt,
  temperature = 0.3,
  maxTokens = 2000,
}: CompleteOptions): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("OpenRouter API key not configured");
  }

  const messages: { role: string; content: string }[] = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: userPrompt });

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model ?? getModel(),
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter request failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ── LLM Complete with search context ───────────────────────────────

export async function openrouterCompleteWithSearch({
  model,
  systemPrompt,
  userPrompt,
  searchQuery,
  temperature = 0.3,
  maxTokens = 2000,
}: {
  model?: string;
  systemPrompt: string;
  userPrompt: string;
  searchQuery?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<{ text: string; searchResults: SearchResult[] }> {
  let searchResults: SearchResult[] = [];
  let searchContext = "";

  if (searchQuery) {
    searchResults = await brightDataSearch(searchQuery);
    if (searchResults.length > 0) {
      searchContext =
        "\n\n## Web Search Results\n" +
        searchResults
          .map((r, i) => `${i + 1}. **${r.title}** (${r.url})\n   ${r.snippet}`)
          .join("\n\n");
    }
  }

  const fullUserPrompt = `${userPrompt}${searchContext}`;

  const text = await openrouterComplete({
    model,
    systemPrompt,
    userPrompt: fullUserPrompt,
    temperature,
    maxTokens,
  });

  return { text, searchResults };
}

// ── Chat helper for Layer 3 ─────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function buildChatSystemPrompt(reviewCase: ReviewCase): string {
  const { customer, watchlist, layer1, layer2 } = reviewCase;
  const aliases = watchlist.entity_aliases || "None";

  return `You are a compliance analyst AI assistant helping a human analyst review a sanctions screening case. You have full context about this case and can search the web for additional information.

## Case Context

### Customer
- Name: ${customer.full_name}
- DOB: ${customer.dob}
- Nationality: ${customer.nationality}
- Email: ${customer.email}

### Matched Sanctions Record
- Entity: ${watchlist.entity_name} (${watchlist.entity_id})
- List: ${watchlist.list_name} (${watchlist.authority})
- DOB: ${watchlist.dob}
- Nationality: ${watchlist.nationality_country}
- Aliases: ${aliases}
- Designation: ${watchlist.entity_notes}
- Effective Date: ${watchlist.effective_date}

### Layer 1 Score
- Composite: ${layer1.composite_score}
- Name Similarity: ${layer1.name_score.toFixed(2)}
- DOB Score: ${layer1.dob_score}
- Nationality Score: ${layer1.nationality_score}

### Layer 2 AI Analysis
- Confidence: ${layer2.ai_confidence}%
- Routing: ${layer2.routing}
- Reasoning: ${layer2.reasoning}
- Matching Signals: ${layer2.matching_signals.join(", ")}
- Conflicting Signals: ${layer2.conflicting_signals.join(", ")}

Help the analyst by answering their questions. Be concise and factual. Cite sources with URLs when available.`;
}

export async function getChatResponse(
  reviewCase: ReviewCase,
  messages: ChatMessage[]
): Promise<string> {
  const systemPrompt = buildChatSystemPrompt(reviewCase);

  const conversationHistory = messages
    .map((m) => `${m.role === "user" ? "Human" : "Assistant"}: ${m.content}`)
    .join("\n\n");

  // Determine if user is asking for a search
  const lastMessage = messages[messages.length - 1];
  const searchKeywords = [
    "find",
    "search",
    "news",
    "recent",
    "court",
    "record",
    "article",
    "report",
  ];
  const needsSearch =
    lastMessage.role === "user" &&
    searchKeywords.some((kw) => lastMessage.content.toLowerCase().includes(kw));

  const searchQuery = needsSearch
    ? `${reviewCase.customer.full_name} ${reviewCase.watchlist.entity_name} ${lastMessage.content}`
    : undefined;

  const { text, searchResults } = await openrouterCompleteWithSearch({
    systemPrompt,
    userPrompt: conversationHistory,
    searchQuery,
  });

  if (searchResults.length > 0) {
    const citations = searchResults.map((r) => `- [${r.title}](${r.url})`).join("\n");
    return `${text}\n\n**Sources:**\n${citations}`;
  }

  return text;
}
