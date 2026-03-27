import { Button, Card } from "@heroui/react";
import Link from "next/link";

const features = [
  {
    title: "Authentication",
    description:
      "Complete auth with email, OAuth, password reset, and session management via Supabase.",
  },
  {
    title: "Payments",
    description:
      "Stripe integration with subscriptions, checkout, customer portal, and webhook handling.",
  },
  {
    title: "Email",
    description:
      "Transactional emails with React Email templates and Resend for reliable delivery.",
  },
  {
    title: "Dashboard",
    description: "Protected dashboard with sidebar navigation, settings, and profile management.",
  },
  {
    title: "Security",
    description: "CSP headers, RLS policies, Zod validation, CSRF protection, and rate limiting.",
  },
  {
    title: "Developer Experience",
    description: "TypeScript strict mode, ESLint, Prettier, Husky hooks, and path aliases.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="flex flex-col items-center justify-center gap-6 px-6 py-24 text-center">
        <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
          Ship your SaaS <span className="text-primary">in days, not months</span>
        </h1>
        <p className="max-w-xl text-lg text-default-500">
          A production-ready boilerplate with authentication, payments, email, and everything you
          need to launch your next SaaS product.
        </p>
        <div className="flex gap-4">
          <Link href="/signup">
            <Button variant="primary" size="lg">
              Get Started
            </Button>
          </Link>
          <Link href="/pricing">
            <Button variant="outline" size="lg">
              View Pricing
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-12 text-center text-3xl font-bold">Everything you need</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title}>
              <Card.Content className="gap-2 p-6">
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="text-default-500">{feature.description}</p>
              </Card.Content>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="flex flex-col items-center gap-6 bg-default-100 px-6 py-20 text-center">
        <h2 className="text-3xl font-bold">Ready to get started?</h2>
        <p className="max-w-lg text-default-500">
          Join thousands of developers who ship faster with our SaaS boilerplate.
        </p>
        <Link href="/signup">
          <Button variant="primary" size="lg">
            Start Building Today
          </Button>
        </Link>
      </section>
    </>
  );
}
