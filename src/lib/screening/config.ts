// Screening pipeline configuration
// All tunable parameters live here — never in Snowflake SQL or hardcoded logic.
// To change thresholds, weights, or model, edit this file only.

export const SCREENING_CONFIG = {
  // ── Layer 2 AI settings ──────────────────────────────────────────────
  layer2: {
    // Snowflake Cortex model identifier
    model: "claude-3-5-sonnet" as string,
    // Lower temperature = more deterministic compliance reasoning
    temperature: 0.3,
    // Keep token budget conservative for production latency/cost.
    maxTokens: 1200,
    // Parallel Cortex calls per batch.
    concurrency: 4,
    // Max Brave Search results per query (two queries run per case).
    searchMaxResults: 2,
    // Hard cap per Layer 2 run to keep API latency predictable.
    maxCasesPerRun: 30,
  },

  // ── Routing thresholds (applied to COMBINED score) ───────────────────
  // combined_score = weighted blend of Layer 1 (normalized) + Layer 2 AI confidence
  routing: {
    // combined_score >= this → AUTO_RESTRICT (auto-reject)
    autoRestrictThreshold: 85,
    // combined_score <= this → AUTO_CLEAR (auto-approve)
    autoClearThreshold: 20,
    // Between the two → HUMAN_REVIEW
  },

  // ── Combined scoring weights ──────────────────────────────────────────
  // combined_score = (layer1_normalized * layer1Weight) + (ai_confidence * layer2Weight)
  // layer1_normalized = Math.min(100, (composite_score / layer1MaxScore) * 100)
  scoring: {
    // Contribution of the deterministic Layer 1 score
    layer1Weight: 0.3,
    // Contribution of the AI Layer 2 confidence score
    layer2Weight: 0.7,
    // Theoretical max composite score from Layer 1
    // (70 name + 25 alias + 30 DOB + 20 nationality = 145 ceiling, ~120 in practice)
    layer1MaxScore: 120,
  },
} as const;

export type ScreeningConfig = typeof SCREENING_CONFIG;

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Normalise a raw Layer 1 composite score to a 0–100 scale.
 */
export function normalizeLayer1Score(compositeScore: number): number {
  return Math.min(100, (compositeScore / SCREENING_CONFIG.scoring.layer1MaxScore) * 100);
}

/**
 * Blend the normalised Layer 1 score and the AI confidence into a single
 * combined score (0–100, rounded to nearest integer).
 */
export function calculateCombinedScore(compositeScore: number, aiConfidence: number): number {
  const l1 = normalizeLayer1Score(compositeScore);
  const { layer1Weight, layer2Weight } = SCREENING_CONFIG.scoring;
  return Math.round(l1 * layer1Weight + aiConfidence * layer2Weight);
}
