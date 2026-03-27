import type { PlanConfig } from "@/types";

export const PLANS: Record<string, PlanConfig> = {
  free: {
    name: "Free",
    description: "Get started with the basics",
    price: 0,
    priceId: null,
    features: ["Up to 3 projects", "Basic analytics", "Community support", "1 GB storage"],
  },
  pro: {
    name: "Pro",
    description: "Everything you need to grow",
    price: 29,
    priceId: process.env.STRIPE_PRO_PRICE_ID ?? "",
    features: [
      "Unlimited projects",
      "Advanced analytics",
      "Priority support",
      "10 GB storage",
      "Custom domains",
      "Team collaboration",
    ],
  },
  enterprise: {
    name: "Enterprise",
    description: "For large-scale operations",
    price: 99,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID ?? "",
    features: [
      "Unlimited everything",
      "Dedicated support",
      "99.9% SLA",
      "100 GB storage",
      "Custom integrations",
      "Advanced security",
      "Audit logs",
      "SSO / SAML",
    ],
  },
};

export function getPlanByPriceId(priceId: string): string | null {
  for (const [key, plan] of Object.entries(PLANS)) {
    if (plan.priceId === priceId) return key;
  }
  return null;
}
