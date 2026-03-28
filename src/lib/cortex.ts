// Snowflake Cortex AI wrapper
// Uses SNOWFLAKE.CORTEX.COMPLETE() for LLM and Brave search for web research
// All AI calls go through Snowflake SQL API — no external AI provider needed

import { executeQuery } from "./snowflake";
import type { ReviewCase } from "@/types/screening";

// ── Cortex Complete (LLM) ───────────────────────────────────────────
//
// IMPORTANT — why we use PARSE_JSON(?) with a bind parameter:
//
// Embedding prompts directly as SQL string literals breaks when the prompt
// contains characters that are significant in SQL or in the Snowflake SQL
// API JSON payload (e.g. single quotes, backslashes, HTML entities from
// Brave search snippets, JavaScript code fragments, etc.).
//
// The safe pattern:
//   1. JSON.stringify the messages array → a valid, fully-escaped JSON string
//   2. Pass it as a bind parameter (key "1") → Snowflake receives it verbatim
//   3. PARSE_JSON(?) converts it to a VARIANT that Cortex can consume
//
// This completely eliminates SQL injection and character-escaping bugs.

interface CortexCompleteOptions {
  model?: string;
  /** If both systemPrompt and userPrompt are provided they are sent as separate
   *  system/user messages. Otherwise `prompt` is sent as a single user message. */
  systemPrompt?: string;
  userPrompt?: string;
  /** Legacy single-message API — used when there is no system/user separation */
  prompt?: string;
  temperature?: number;
  maxTokens?: number;
}

function cortexLog(step: string, data?: unknown) {
  const ts = new Date().toISOString();
  if (data !== undefined) {
    console.log(`[Cortex] ${ts} | ${step}`, data);
  } else {
    console.log(`[Cortex] ${ts} | ${step}`);
  }
}

export async function cortexComplete({
  model = "claude-3-5-sonnet",
  systemPrompt,
  userPrompt,
  prompt,
  temperature = 0.3,
  maxTokens = 2000,
}: CortexCompleteOptions): Promise<string> {
  // Build the messages array
  const messages: { role: string; content: string }[] = [];

  if (systemPrompt && userPrompt) {
    messages.push({ role: "system", content: systemPrompt });
    messages.push({ role: "user", content: userPrompt });
  } else {
    messages.push({ role: "user", content: prompt ?? "" });
  }

  // JSON.stringify handles ALL special characters safely (newlines, quotes,
  // backslashes, Unicode, etc.) — no manual SQL escaping needed.
  const messagesJson = JSON.stringify(messages);

  cortexLog(`COMPLETE call`, {
    model,
    temperature,
    maxTokens,
    messages: messages.map((m) => ({ role: m.role, chars: m.content.length })),
    totalPayloadChars: messagesJson.length,
  });

  const sql = `
    SELECT SNOWFLAKE.CORTEX.COMPLETE(
      '${model}',
      PARSE_JSON(?),
      {'temperature': ${temperature}, 'max_tokens': ${maxTokens}}
    ) AS response
  `;

  const t0 = Date.now();
  const result = await executeQuery<{ response: string }>(sql, { "1": messagesJson });
  const ms = Date.now() - t0;

  if (result.rows.length === 0) {
    cortexLog(`COMPLETE ERROR — no rows returned (${ms}ms)`, {
      model,
      payloadChars: messagesJson.length,
    });
    throw new Error("Cortex COMPLETE returned no results");
  }

  // Cortex returns JSON with a choices array
  const raw = result.rows[0].response;
  cortexLog(`COMPLETE OK (${ms}ms)`, {
    rawChars: String(raw).length,
    rawPreview: String(raw).slice(0, 100),
  });

  try {
    const parsed = JSON.parse(raw);
    return parsed.choices?.[0]?.messages ?? parsed.choices?.[0]?.message?.content ?? raw;
  } catch {
    cortexLog(`COMPLETE response parse FAILED — returning raw`, { raw: String(raw).slice(0, 200) });
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
  cortexLog(`braveSearch START`, { query, maxResults });

  // CORTEX.SEARCH_PREVIEW does NOT accept bind parameters — using them causes
  // Snowflake to wrap the integer literal in TO_CHAR() and reject it.
  // Simple single-quote escaping is sufficient here; the query is AI-generated
  // and the only problematic character in real names is the apostrophe.
  const escapedQuery = query.replace(/'/g, "''");

  const sql = `
    SELECT PARSE_JSON(SNOWFLAKE.CORTEX.SEARCH_PREVIEW(
      '${escapedQuery}',
      ${maxResults}
    )) AS results
  `;

  const t0 = Date.now();
  try {
    const result = await executeQuery<{ results: string }>(sql);
    const ms = Date.now() - t0;

    if (result.rows.length === 0) {
      cortexLog(`braveSearch EMPTY (${ms}ms) — no rows`, { query });
      return [];
    }

    const parsed = JSON.parse(result.rows[0].results as unknown as string);
    const hits = (parsed.results ?? parsed ?? []).map((r: Record<string, string>) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      snippet: r.snippet ?? r.description ?? "",
    }));

    cortexLog(`braveSearch OK (${ms}ms)`, {
      query,
      hits: hits.length,
      urls: hits.map((h: SearchResult) => h.url),
    });
    return hits;
  } catch (err) {
    const ms = Date.now() - t0;
    cortexLog(`braveSearch ERROR (${ms}ms)`, { query, error: String(err) });
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

// ── Cortex Complete with optional search context ─────────────────────

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
  // Run web search first if a query was provided
  let searchResults: SearchResult[] = [];
  let enrichedUserPrompt = userPrompt;

  if (searchQuery) {
    searchResults = await braveSearch(searchQuery);
    if (searchResults.length > 0) {
      const searchContext =
        "\n\n## Web Search Results\n" +
        searchResults
          .map((r, i) => `${i + 1}. **${r.title}** (${r.url})\n   ${r.snippet}`)
          .join("\n\n");
      enrichedUserPrompt = userPrompt + searchContext;
    }
  }

  const text = await cortexComplete({
    model,
    systemPrompt,
    userPrompt: enrichedUserPrompt,
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
- Combined Score: ${layer2.combined_score}%
- AI Confidence: ${layer2.ai_confidence}%
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

  // Build conversation history into a single user message
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
