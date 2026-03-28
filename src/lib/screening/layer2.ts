// Layer 2 — AI-Powered Deep Screening
//
// For each flag produced by Layer 1 this module:
//   1. Runs TWO separate Brave searches via Snowflake Cortex:
//      a) Background research on the CUSTOMER (who they actually are)
//      b) Background research on the SANCTIONS ENTITY (who is sanctioned)
//   2. Feeds both research summaries + the structured data into Cortex COMPLETE
//   3. The AI reasons about whether the two individuals are the same person
//   4. Produces ai_confidence (0–100) + detailed reasoning trail
//   5. Blends ai_confidence with the Layer 1 score → combined_score
//   6. Routes the case using combined_score against configurable thresholds

import { cortexCompleteWithSearch, braveSearch } from "@/lib/cortex";
import type { Customer, SanctionsEntry, Layer1Flag, Layer2Result } from "@/types/screening";
import { SCREENING_CONFIG, calculateCombinedScore } from "./config";
import { routeByConfidence } from "./routing";

export interface Layer2Input {
  customer: Customer;
  sanctions: SanctionsEntry;
  flag: Layer1Flag;
}

// ── Debug logger ────────────────────────────────────────────────────

function log(step: string, data?: unknown) {
  const ts = new Date().toISOString();
  if (data !== undefined) {
    console.log(`[Layer2] ${ts} | ${step}`, data);
  } else {
    console.log(`[Layer2] ${ts} | ${step}`);
  }
}

// ── System prompt ───────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior sanctions compliance analyst AI. You have been given:
1. A customer record from a financial institution's onboarding database
2. A watchlist/sanctions entry that was flagged as a potential match by the deterministic screening engine (Layer 1)
3. Online research results about the CUSTOMER (what can be found about them publicly)
4. Online research results about the SANCTIONS ENTITY (what is publicly known about who was sanctioned and why)

Your task is to determine how likely it is that the customer IS the sanctioned person.

## Analysis steps — work through each explicitly:

### Step 1 — Profile the customer from online research
What does the public record say about this customer? Look for: occupation, location, business activities, public profiles, news mentions, any red flags or connections to sanctioned networks.

### Step 2 — Profile the sanctions entity from online research
What is publicly known about this sanctioned individual/entity? Look for: reason for designation, background, known activities, reported associates, news coverage of the designation.

### Step 3 — Cross-compare the two profiles
Compare every available data point:
- Name (exact, partial, nickname, transliteration variants)
- Date of birth (exact, partial, plausible transcription errors)
- Nationality / citizenship / place of birth
- Address / country of operation
- Occupation / sector / business connections
- Publicly reported activities, associates, or entity affiliations
- Any aliases or alternative name spellings

### Step 4 — Assess match likelihood
Consider BOTH directions:
- What evidence SUPPORTS these being the same person?
- What evidence CONTRADICTS these being the same person?

## Scoring rubric:
- 90–100: Near-certain match — multiple independent strong signals align, no meaningful contradictions
- 70–89:  High confidence — most signals align, minor uncertainties remain
- 40–69:  Moderate — significant signals match but meaningful conflicts or gaps exist
- 10–39:  Low confidence — mostly superficial similarity (common name), substantive conflicts
- 0–9:    Near-certain false positive — clear, positive evidence of different person

## Output format — respond ONLY with this JSON (no markdown wrapper):
{
  "ai_confidence": <integer 0-100>,
  "reasoning": "<detailed narrative that walks through all four analysis steps>",
  "matching_signals": ["<concise signal>", ...],
  "conflicting_signals": ["<concise signal>", ...],
  "customer_background": "<1-3 sentence summary of what online research reveals about the customer>",
  "sanctions_background": "<1-3 sentence summary of what online research reveals about the sanctions entity>",
  "sources": [{"label": "<descriptive title>", "url": "<url>"}]
}

Be thorough but evidence-based. Never speculate beyond what the data and search results show.`;

// ── Prompt builder ──────────────────────────────────────────────────

function buildUserPrompt(
  input: Layer2Input,
  customerSearchResults: { title: string; url: string; snippet: string }[],
  sanctionsSearchResults: { title: string; url: string; snippet: string }[]
): string {
  const { customer, sanctions, flag } = input;
  const aliases = sanctions.entity_aliases || "None listed";

  const formatResults = (
    results: { title: string; url: string; snippet: string }[],
    label: string
  ) => {
    if (results.length === 0) return `## ${label}\nNo results found.\n`;
    return (
      `## ${label}\n` +
      results.map((r, i) => `${i + 1}. **${r.title}** (${r.url})\n   ${r.snippet}`).join("\n\n")
    );
  };

  return `## Customer Record (to be screened)
- **Name:** ${customer.full_name}
- **Date of Birth:** ${customer.dob || "Not provided"}
- **Nationality:** ${customer.nationality || "Not provided"}
- **Email:** ${customer.email || "Not provided"}
- **Entity Type:** ${customer.entity_type}

## Matched Sanctions Record
- **Entity Name:** ${sanctions.entity_name}
- **Entity ID:** ${sanctions.entity_id}
- **List:** ${sanctions.list_name} (issued by ${sanctions.authority}, country: ${sanctions.listing_country})
- **Date of Birth:** ${sanctions.dob || "Not listed"}
- **Nationality:** ${sanctions.nationality_country || "Not listed"}
- **Citizenship:** ${sanctions.citizenship_country || "Not listed"}
- **Place of Birth:** ${sanctions.pob || "Not listed"}
- **Known Aliases:** ${aliases}
- **Designation Reason:** ${sanctions.entity_notes || "Not provided"}
- **Effective Date:** ${sanctions.effective_date}
- **Last Known Address:** ${sanctions.address || "Not listed"}
- **Citation:** ${sanctions.citation_link || "Not provided"}

## Layer 1 Deterministic Score (for context)
- **Composite Score:** ${flag.composite_score} / 120 (threshold ≥ 50 to flag)
- **Name Similarity (Jaro-Winkler):** ${flag.name_score.toFixed(3)} (1.0 = identical)
- **DOB Score:** ${flag.dob_score} pts (30 = exact, 15 = ≤1yr diff, 0 = no match)
- **Nationality Score:** ${flag.nationality_score} pts (20 = match, -10 = mismatch)

${formatResults(customerSearchResults, "Online Research — Customer Background")}

${formatResults(sanctionsSearchResults, "Online Research — Sanctions Entity Background")}

Please complete your analysis following the four steps in the system prompt.`;
}

// ── AI response type ────────────────────────────────────────────────

interface AIAnalysis {
  ai_confidence: number;
  reasoning: string;
  matching_signals: string[];
  conflicting_signals: string[];
  customer_background: string;
  sanctions_background: string;
  sources: { label: string; url: string }[];
}

function parseAnalysis(text: string, caseLabel: string): AIAnalysis {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as AIAnalysis;
      log(`${caseLabel} | parse OK`, {
        ai_confidence: parsed.ai_confidence,
        matching: parsed.matching_signals?.length ?? 0,
        conflicting: parsed.conflicting_signals?.length ?? 0,
        sources: parsed.sources?.length ?? 0,
      });
      return parsed;
    } catch (err) {
      log(`${caseLabel} | parse FAILED — JSON.parse error`, {
        error: String(err),
        raw: text.slice(0, 200),
      });
    }
  } else {
    log(`${caseLabel} | parse FAILED — no JSON block found in response`, {
      raw: text.slice(0, 200),
    });
  }
  return {
    ai_confidence: 50,
    reasoning: text,
    matching_signals: [],
    conflicting_signals: [],
    customer_background: "Online research results were unavailable or inconclusive.",
    sanctions_background: "Online research results were unavailable or inconclusive.",
    sources: [],
  };
}

// ── Core case processor ─────────────────────────────────────────────

export async function processCase(input: Layer2Input): Promise<Layer2Result> {
  const { customer, sanctions, flag } = input;
  const cfg = SCREENING_CONFIG.layer2;
  const caseLabel = `case ${flag.flag_id} [${customer.full_name} vs ${sanctions.entity_name}]`;

  log(`${caseLabel} | START`);

  // ── Step 1: Dual parallel Brave searches ──────────────────────────
  const customerQuery = `"${customer.full_name}" ${customer.nationality} ${customer.dob ? customer.dob.split("-")[0] : ""} background`;
  const sanctionsQuery = `"${sanctions.entity_name}" ${sanctions.authority} ${sanctions.list_name} ${sanctions.nationality_country} sanctions designation`;

  log(`${caseLabel} | Brave search START`, {
    customerQuery,
    sanctionsQuery,
    maxResults: cfg.searchMaxResults,
  });

  const searchStart = Date.now();
  const [customerSearchResults, sanctionsSearchResults] = await Promise.all([
    braveSearch(customerQuery, cfg.searchMaxResults),
    braveSearch(sanctionsQuery, cfg.searchMaxResults),
  ]);
  const searchMs = Date.now() - searchStart;

  log(`${caseLabel} | Brave search DONE (${searchMs}ms)`, {
    customerResults: customerSearchResults.length,
    sanctionsResults: sanctionsSearchResults.length,
    customerUrls: customerSearchResults.map((r) => r.url),
    sanctionsUrls: sanctionsSearchResults.map((r) => r.url),
  });

  // ── Step 2: Build the combined AI prompt ──────────────────────────
  const userPrompt = buildUserPrompt(input, customerSearchResults, sanctionsSearchResults);
  const promptChars = SYSTEM_PROMPT.length + userPrompt.length;

  log(`${caseLabel} | Cortex COMPLETE START`, {
    model: cfg.model,
    temperature: cfg.temperature,
    maxTokens: cfg.maxTokens,
    systemPromptChars: SYSTEM_PROMPT.length,
    userPromptChars: userPrompt.length,
    totalChars: promptChars,
  });

  const cortexStart = Date.now();
  let text: string;
  try {
    const result = await cortexCompleteWithSearch({
      model: cfg.model,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      temperature: cfg.temperature,
      maxTokens: cfg.maxTokens,
    });
    text = result.text;
  } catch (err) {
    const cortexMs = Date.now() - cortexStart;
    log(`${caseLabel} | Cortex COMPLETE ERROR (${cortexMs}ms)`, { error: String(err) });
    throw err;
  }
  const cortexMs = Date.now() - cortexStart;

  log(`${caseLabel} | Cortex COMPLETE DONE (${cortexMs}ms)`, {
    responseChars: text.length,
    responsePreview: text.slice(0, 150),
  });

  // ── Step 3: Parse AI response ─────────────────────────────────────
  const analysis = parseAnalysis(text, caseLabel);

  // Merge any sources the AI cited with the search results we ran
  const allUrls = new Set(analysis.sources.map((s) => s.url));
  for (const r of [...customerSearchResults, ...sanctionsSearchResults]) {
    if (!allUrls.has(r.url)) {
      analysis.sources.push({ label: r.title, url: r.url });
      allUrls.add(r.url);
    }
  }

  // ── Step 4: Combined scoring ──────────────────────────────────────
  const combined_score = calculateCombinedScore(flag.composite_score, analysis.ai_confidence);
  const routing = routeByConfidence(combined_score);

  log(`${caseLabel} | COMPLETE`, {
    layer1_composite: flag.composite_score,
    ai_confidence: analysis.ai_confidence,
    combined_score,
    routing,
    totalMs: Date.now() - searchStart,
  });

  return {
    result_id: `L2-${flag.flag_id}`,
    flag_id: flag.flag_id,
    customer_id: customer.customer_id,
    entity_id: sanctions.entity_id,
    ai_confidence: analysis.ai_confidence,
    combined_score,
    routing,
    reasoning: analysis.reasoning,
    matching_signals: analysis.matching_signals,
    conflicting_signals: analysis.conflicting_signals,
    customer_background: analysis.customer_background,
    sanctions_background: analysis.sanctions_background,
    sources: analysis.sources,
    processed_at: new Date().toISOString(),
  };
}

// ── Batch processor ─────────────────────────────────────────────────

export async function processBatch(inputs: Layer2Input[]): Promise<Layer2Result[]> {
  const { concurrency } = SCREENING_CONFIG.layer2;
  const total = inputs.length;
  const results: Layer2Result[] = [];

  log(`processBatch START`, { total, concurrency });

  for (let i = 0; i < total; i += concurrency) {
    const batch = inputs.slice(i, i + concurrency);
    const batchNum = Math.floor(i / concurrency) + 1;
    const totalBatches = Math.ceil(total / concurrency);

    log(`processBatch batch ${batchNum}/${totalBatches} START`, {
      cases: batch.map((b) => b.flag.flag_id),
    });

    const batchStart = Date.now();
    const batchResults = await Promise.allSettled(batch.map(processCase));
    const batchMs = Date.now() - batchStart;

    let ok = 0;
    let failed = 0;
    for (const r of batchResults) {
      if (r.status === "fulfilled") {
        results.push(r.value);
        ok++;
      } else {
        failed++;
        log(`processBatch batch ${batchNum}/${totalBatches} | case FAILED`, {
          reason: r.reason instanceof Error ? r.reason.message : String(r.reason),
        });
      }
    }

    log(`processBatch batch ${batchNum}/${totalBatches} DONE (${batchMs}ms)`, {
      ok,
      failed,
      runningTotal: results.length,
    });
  }

  const summary = {
    total: results.length,
    auto_restrict: results.filter((r) => r.routing === "AUTO_RESTRICT").length,
    auto_clear: results.filter((r) => r.routing === "AUTO_CLEAR").length,
    human_review: results.filter((r) => r.routing === "HUMAN_REVIEW").length,
  };

  log(`processBatch DONE`, summary);

  return results;
}
