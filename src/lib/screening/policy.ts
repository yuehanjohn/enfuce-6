import { calculateCombinedScore } from "./config";
import type { Layer1Flag, Layer2Result, RoutingDecision } from "@/types/screening";

export interface FastPassDecision {
  route: RoutingDecision;
  aiConfidence: number;
  reason: string;
}

export function evaluateFastPass(flag: Layer1Flag): FastPassDecision | null {
  // Very strong deterministic hit: exact/near exact ID profile match.
  if (flag.composite_score >= 95 && flag.dob_score >= 15 && flag.name_score >= 0.9) {
    return {
      route: "AUTO_RESTRICT",
      aiConfidence: 95,
      reason:
        "Fast pass auto-restrict: very high Layer 1 confidence with strong name and DOB alignment.",
    };
  }

  // Weak deterministic signal: likely name collision with no strong corroboration.
  if (flag.composite_score <= 55 && flag.dob_score === 0 && flag.nationality_score <= 0) {
    return {
      route: "AUTO_CLEAR",
      aiConfidence: 8,
      reason:
        "Fast pass auto-clear: weak deterministic signal with no DOB support and no nationality support.",
    };
  }

  return null;
}

export function buildFastPassResult(flag: Layer1Flag, decision: FastPassDecision): Layer2Result {
  return {
    result_id: `L2-${flag.flag_id}`,
    flag_id: flag.flag_id,
    customer_id: flag.customer_id,
    entity_id: flag.entity_id,
    ai_confidence: decision.aiConfidence,
    combined_score: calculateCombinedScore(flag.composite_score, decision.aiConfidence),
    routing: decision.route,
    reasoning: decision.reason,
    matching_signals: [],
    conflicting_signals: [],
    sources: [],
    customer_background: "",
    sanctions_background: "",
    processed_at: new Date().toISOString(),
  };
}
