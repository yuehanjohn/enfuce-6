import { Button, Card, Chip } from "@heroui/react";
import Link from "next/link";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with the basics",
    features: ["Up to 3 projects", "Basic analytics", "Community support", "1 GB storage"],
    cta: "Get Started",
    href: "/signup",
    popular: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "Everything you need to grow",
    features: [
      "Unlimited projects",
      "Advanced analytics",
      "Priority support",
      "10 GB storage",
      "Custom domains",
      "Team collaboration",
    ],
    cta: "Start Free Trial",
    href: "/signup",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "$99",
    period: "/month",
    description: "For large-scale operations",
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
    cta: "Contact Sales",
    href: "/signup",
    popular: false,
  },
];

export const metadata = {
  title: "Pricing",
};

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-20">
      <div className="mb-16 text-center">
        <h1 className="text-4xl font-bold">Simple, transparent pricing</h1>
        <p className="mt-4 text-lg text-default-500">
          Choose the plan that fits your needs. Upgrade or downgrade at any time.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.name} className={plan.popular ? "border-2 border-primary" : ""}>
            <Card.Header>
              <div className="flex flex-col items-start gap-2">
                <div className="flex items-center gap-2">
                  <Card.Title>{plan.name}</Card.Title>
                  {plan.popular && (
                    <Chip color="accent" size="sm">
                      <Chip.Label>Popular</Chip.Label>
                    </Chip>
                  )}
                </div>
                <Card.Description>{plan.description}</Card.Description>
                <div className="mt-2">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-default-500">{plan.period}</span>
                </div>
              </div>
            </Card.Header>
            <Card.Content>
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <svg
                      className="h-4 w-4 text-success"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </Card.Content>
            <Card.Footer>
              <Link href={plan.href} className="w-full">
                <Button variant={plan.popular ? "primary" : "outline"} className="w-full" size="lg">
                  {plan.cta}
                </Button>
              </Link>
            </Card.Footer>
          </Card>
        ))}
      </div>

      {/* FAQ */}
      <div className="mt-20">
        <h2 className="mb-8 text-center text-3xl font-bold">Frequently asked questions</h2>
        <div className="mx-auto max-w-2xl space-y-6">
          {[
            {
              q: "Can I switch plans?",
              a: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.",
            },
            {
              q: "Is there a free trial?",
              a: "Yes, the Pro plan comes with a 14-day free trial. No credit card required to start.",
            },
            {
              q: "What payment methods do you accept?",
              a: "We accept all major credit cards, debit cards, and select local payment methods through Stripe.",
            },
            {
              q: "Can I cancel anytime?",
              a: "Absolutely. You can cancel your subscription at any time from your billing settings.",
            },
          ].map((faq) => (
            <div key={faq.q} className="rounded-lg border border-default-200 p-6">
              <h3 className="font-semibold">{faq.q}</h3>
              <p className="mt-2 text-default-500">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
