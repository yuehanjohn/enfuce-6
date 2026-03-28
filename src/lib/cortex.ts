// Snowflake Cortex AI wrapper
// Uses SNOWFLAKE.CORTEX.COMPLETE() for LLM and Brave search for web research
// All AI calls go through Snowflake SQL API — no external AI provider needed

import { executeQuery } from "./snowflake";
import type { ReviewCase } from "@/types/screening";

// ── Cortex Complete (LLM) ───────────────────────────────────────────

interface CortexCompleteOptions {
  model?: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

export async function cortexComplete({
  model = "claude-3-5-sonnet",
  prompt,
  temperature = 0.3,
  maxTokens = 2000,
}: CortexCompleteOptions): Promise<string> {
  // Escape single quotes in prompt for SQL
  const escapedPrompt = prompt.replace(/'/g, "''");

  const sql = `
    SELECT SNOWFLAKE.CORTEX.COMPLETE(
      '${model}',
      [
        {
          'role': 'user',
          'content': '${escapedPrompt}'
        }
      ],
      {
        'temperature': ${temperature},
        'max_tokens': ${maxTokens}
      }
    ) AS response;
  `;

  const result = await executeQuery<{ response: string }>(sql);
  if (result.rows.length === 0) {
    throw new Error("Cortex COMPLETE returned no results");
  }

  // Parse the response — Cortex returns JSON with choices
  const raw = result.rows[0].response;
  try {
    const parsed = JSON.parse(raw);
    return parsed.choices?.[0]?.messages ?? parsed.choices?.[0]?.message?.content ?? raw;
  } catch {
    return raw;
  }
}

// ── Brave Search via Snowflake Cortex ───────────────────────────────

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function braveSearch(query: string, maxResults = 5): Promise<SearchResult[]> {
  const escapedQuery = query.replace(/'/g, "''");

  // Snowflake Cortex integrates Brave Search via CORTEX.SEARCH_PREVIEW
  // or via the search integration function
  const sql = `
    SELECT PARSE_JSON(SNOWFLAKE.CORTEX.SEARCH_PREVIEW(
      '${escapedQuery}',
      ${maxResults}
    )) AS results;
  `;

  try {
    const result = await executeQuery<{ results: string }>(sql);
    if (result.rows.length === 0) return [];

    const parsed = JSON.parse(result.rows[0].results);
    return (parsed.results ?? parsed ?? []).map((r: Record<string, string>) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      snippet: r.snippet ?? r.description ?? "",
    }));
  } catch {
    return [];
  }
}

// ── Multi-query Brave Search ─────────────────────────────────────────

/**
 * Run multiple Brave searches in parallel and return deduplicated results.
 * Use this when you need separate research on two different subjects.
 */
export async function multiSearch(queries: string[], maxResultsEach = 5): Promise<SearchResult[]> {
  const allResults = await Promise.all(queries.map((q) => braveSearch(q, maxResultsEach)));
  const seen = new Set<string>();
  const deduped: SearchResult[] = [];
  for (const batch of allResults) {
    for (const r of batch) {
      if (!seen.has(r.url)) {
        seen.add(r.url);
        deduped.push(r);
      }
    }
  }
  return deduped;
}

// ── Cortex Complete with search context ─────────────────────────────

export async function cortexCompleteWithSearch({
  model = "claude-3-5-sonnet",
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
  // First do web search if query provided
  let searchResults: SearchResult[] = [];
  let searchContext = "";

  if (searchQuery) {
    searchResults = await braveSearch(searchQuery);
    if (searchResults.length > 0) {
      searchContext =
        "\n\n## Web Search Results\n" +
        searchResults
          .map((r, i) => `${i + 1}. **${r.title}** (${r.url})\n   ${r.snippet}`)
          .join("\n\n");
    }
  }

  const fullPrompt = `${systemPrompt}\n\n${userPrompt}${searchContext}`;

  const text = await cortexComplete({ model, prompt: fullPrompt, temperature, maxTokens });
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

  // Build conversation history into a single prompt
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

  const { text, searchResults } = await cortexCompleteWithSearch({
    systemPrompt,
    userPrompt: conversationHistory,
    searchQuery,
  });

  // Append search results as citations if found
  if (searchResults.length > 0) {
    const citations = searchResults.map((r) => `- [${r.title}](${r.url})`).join("\n");
    return `${text}\n\n**Sources:**\n${citations}`;
  }

  return text;
}
