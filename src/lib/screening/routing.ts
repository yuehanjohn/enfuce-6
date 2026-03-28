// Confidence/combined-score → Routing Decision
// Thresholds come from SCREENING_CONFIG so they're editable in one place.

import type { RoutingDecision } from "@/types/screening";
import { SCREENING_CONFIG } from "./config";

/**
 * Map a combined score (0–100) to a routing decision.
 * Pass the combined_score (not raw ai_confidence) for production routing.
 */
export function routeByConfidence(score: number): RoutingDecision {
  const { autoRestrictThreshold, autoClearThreshold } = SCREENING_CONFIG.routing;
  if (score >= autoRestrictThreshold) return "AUTO_RESTRICT";
  if (score <= autoClearThreshold) return "AUTO_CLEAR";
  return "HUMAN_REVIEW";
}

export function getRoutingLabel(routing: RoutingDecision): string {
  switch (routing) {
    case "AUTO_RESTRICT":
      return "Auto-Restricted";
    case "AUTO_CLEAR":
      return "Auto-Cleared";
    case "HUMAN_REVIEW":
      return "Human Review";
  }
}

export function getRoutingColor(routing: RoutingDecision): "danger" | "success" | "warning" {
  switch (routing) {
    case "AUTO_RESTRICT":
      return "danger";
    case "AUTO_CLEAR":
      return "success";
    case "HUMAN_REVIEW":
      return "warning";
  }
}

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return "text-danger";
  if (confidence >= 60) return "text-warning";
  if (confidence >= 40) return "text-yellow-500";
  return "text-success";
}
