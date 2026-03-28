// Layer 2 — AI Processing
// Uses OpenRouter for LLM reasoning + Bright Data for web search

import { openrouterCompleteWithSearch } from "@/lib/openrouter";
import type { Customer, SanctionsEntry, Layer1Flag, Layer2Result } from "@/types/screening";
import { routeByConfidence } from "./routing";

interface Layer2Input {
  customer: Customer;
  sanctions: SanctionsEntry;
  flag: Layer1Flag;
}

const SYSTEM_PROMPT = `You are a compliance screening analyst AI. You are given a customer record and a matched sanctions/watchlist record that were flagged by a deterministic screening system.

Your job is to:
1. Analyze the match quality between the customer and the sanctions record
2. Consider web search results provided below (if any)
3. Produce a confidence score (0-100) indicating how likely the customer IS the sanctioned person
4. Provide detailed reasoning

Scoring guidelines:
- 90-100: Near certain match — multiple strong signals align, independent sources corroborate
- 70-89: High confidence — most signals align but some uncertainty remains
- 40-69: Moderate — significant signals match but meaningful conflicts exist
- 10-39: Low confidence — mostly name similarity with conflicting data points
- 0-9: Near certain false positive — clear evidence of different person

Output your analysis as JSON with this exact structure:
{
  "ai_confidence": <number 0-100>,
  "reasoning": "<detailed narrative explaining your analysis>",
  "matching_signals": ["<signal1>", "<signal2>"],
  "conflicting_signals": ["<signal1>", "<signal2>"],
  "sources": [{"label": "<description>", "url": "<url>"}]
}

Be thorough but concise. Every claim must be supported by evidence.`;

function buildUserPrompt(input: Layer2Input): string {
  const { customer, sanctions, flag } = input;
  const aliases = sanctions.entity_aliases || "None listed";

  return `## Customer Record
- **Name:** ${customer.full_name}
- **DOB:** ${customer.dob}
- **Nationality:** ${customer.nationality}
- **Email:** ${customer.email}
- **Entity Type:** ${customer.entity_type}

## Matched Sanctions Record
- **Entity Name:** ${sanctions.entity_name}
- **Entity ID:** ${sanctions.entity_id}
- **List:** ${sanctions.list_name} (${sanctions.authority})
- **DOB:** ${sanctions.dob}
- **Nationality:** ${sanctions.nationality_country}
- **Citizenship:** ${sanctions.citizenship_country}
- **Aliases:** ${aliases}
- **Designation Reason:** ${sanctions.entity_notes}
- **Effective Date:** ${sanctions.effective_date}
- **Place of Birth:** ${sanctions.pob}
- **Address:** ${sanctions.address}

## Layer 1 Screening Score
- **Composite Score:** ${flag.composite_score}
- **Name Similarity:** ${flag.name_score.toFixed(2)}
- **DOB Score:** ${flag.dob_score}
- **Nationality Score:** ${flag.nationality_score}

Please analyze this case and provide your confidence assessment as JSON.`;
}

interface AIAnalysis {
  ai_confidence: number;
  reasoning: string;
  matching_signals: string[];
  conflicting_signals: string[];
  sources: { label: string; url: string }[];
}

export async function processCase(input: Layer2Input): Promise<Layer2Result> {
  const searchQuery = `${input.customer.full_name} ${input.sanctions.entity_name} sanctions`;

  const { text, searchResults } = await openrouterCompleteWithSearch({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(input),
    searchQuery,
  });

  // Parse JSON from response (may be wrapped in markdown code block)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  let analysis: AIAnalysis;

  if (jsonMatch) {
    try {
      analysis = JSON.parse(jsonMatch[0]);
    } catch {
      analysis = {
        ai_confidence: 50,
        reasoning: text,
        matching_signals: [],
        conflicting_signals: [],
        sources: [],
      };
    }
  } else {
    analysis = {
      ai_confidence: 50,
      reasoning: text,
      matching_signals: [],
      conflicting_signals: [],
      sources: [],
    };
  }

  // Merge search results into sources if not already present
  for (const sr of searchResults) {
    if (!analysis.sources.some((s) => s.url === sr.url)) {
      analysis.sources.push({ label: sr.title, url: sr.url });
    }
  }

  const routing = routeByConfidence(analysis.ai_confidence);

  return {
    result_id: `L2-${input.flag.flag_id}`,
    flag_id: input.flag.flag_id,
    customer_id: input.customer.customer_id,
    entity_id: input.sanctions.entity_id,
    ai_confidence: analysis.ai_confidence,
    routing,
    reasoning: analysis.reasoning,
    matching_signals: analysis.matching_signals,
    conflicting_signals: analysis.conflicting_signals,
    sources: analysis.sources,
    processed_at: new Date().toISOString(),
  };
}

export async function processBatch(inputs: Layer2Input[]): Promise<Layer2Result[]> {
  const CONCURRENCY = 5;
  const results: Layer2Result[] = [];

  for (let i = 0; i < inputs.length; i += CONCURRENCY) {
    const batch = inputs.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(processCase));
    results.push(...batchResults);
  }

  return results;
}
