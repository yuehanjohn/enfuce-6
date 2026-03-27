import { Button, Card } from "@heroui/react";
import Link from "next/link";

const features = [
  {
    title: "Layer 1 — Hard Rules",
    description:
      "Deterministic SQL screening with Jaro-Winkler fuzzy matching, DOB similarity, and nationality scoring. 100k customers to ~300 flags in seconds.",
  },
  {
    title: "Layer 2 — AI Analysis",
    description:
      "Snowflake Cortex AI + Brave Search researches each flagged case. Auto-restricts high confidence, auto-clears false positives.",
  },
  {
    title: "Layer 3 — Human Review",
    description:
      "Friction-free analyst dashboard with field comparison, reasoning trail, source links, and embedded AI chat assistant.",
  },
  {
    title: "Full Audit Trail",
    description:
      "Immutable log of every decision — Layer 1 flags, AI reasoning, human decisions, and chat transcripts. Legally defensible.",
  },
  {
    title: "Snowflake-Native",
    description:
      "All data lives in Snowflake. Uses real schemas: GLOBAL_SANCTIONS_DATA.SANCTIONS_DATAFEED and TPCDS customer records.",
  },
  {
    title: "Ethical AI",
    description:
      "Human-in-the-loop for ambiguous cases. AI explains its reasoning with cited sources. No black-box decisions.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="flex flex-col items-center justify-center gap-6 px-6 py-24 text-center">
        <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
          Intelligent Sanctions <span className="text-primary">Screening</span>
        </h1>
        <p className="max-w-xl text-lg text-default-500">
          Three-layer screening pipeline that combines deterministic rules, AI reasoning, and
          human oversight to screen customers against global sanctions and PEP lists.
        </p>
        <div className="flex gap-4">
          <Link href="/login">
            <Button variant="primary" size="lg">
              Launch Demo
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-12 text-center text-3xl font-bold">Three-Layer Architecture</h2>
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
        <h2 className="text-3xl font-bold">Try the Demo</h2>
        <p className="max-w-lg text-default-500">
          Walk through a complete screening pipeline — from 100k customers down to individual analyst review.
        </p>
        <Link href="/login">
          <Button variant="primary" size="lg">
            Sign In
          </Button>
        </Link>
      </section>
    </>
  );
}
