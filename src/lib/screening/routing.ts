// Confidence → Routing Decision
import type { RoutingDecision } from "@/types/screening";

export function routeByConfidence(aiConfidence: number): RoutingDecision {
  if (aiConfidence >= 90) return "AUTO_RESTRICT";
  if (aiConfidence <= 10) return "AUTO_CLEAR";
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
  if (confidence >= 20) return "text-success";
  return "text-success";
}
