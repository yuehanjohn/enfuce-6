export type { Database, Json } from "./database";

export type Plan = "free" | "pro" | "enterprise";
export type SubscriptionStatus = "active" | "canceled" | "past_due" | "trialing" | "incomplete";

export interface ApiError {
  error: string;
  code: string;
}

export interface PlanConfig {
  name: string;
  description: string;
  price: number;
  priceId: string | null;
  features: string[];
}
