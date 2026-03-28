"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Card } from "@heroui/react";
import { AIChat } from "@/components/screening/AIChat";
import { DecisionBar } from "@/components/screening/DecisionBar";
import type {
  Layer1Flag,
  ReviewCase,
  SanctionsEntry,
  Customer,
  Layer2Result,
  Source,
} from "@/types/screening";
import Link from "next/link";

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z"
      />
    </svg>
  );
}

function ExternalResourceIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.85}
      stroke="currentColor"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H18m0 0v4.5M18 6l-7.5 7.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13.5V18H6V9h4.5" />
    </svg>
  );
}

function getRiskLevel(confidence: number) {
  if (confidence >= 70) {
    return { label: "High Risk", textClassName: "text-danger", barClassName: "bg-danger" };
  }

  if (confidence >= 40) {
    return { label: "Moderate Risk", textClassName: "text-warning", barClassName: "bg-warning" };
  }

  return { label: "Low Risk", textClassName: "text-success", barClassName: "bg-success" };
}

function getNameMatch(score: number): "exact" | "partial" | "mismatch" {
  if (score >= 0.92) return "exact";
  if (score >= 0.82) return "partial";
  return "mismatch";
}

function getDobMatch(
  customerDob: string,
  watchlistDob: string
): "exact" | "partial" | "mismatch" | "neutral" {
  if (!customerDob || !watchlistDob) return "neutral";
  if (customerDob === watchlistDob) return "exact";
  const diff = Math.abs(new Date(customerDob).getFullYear() - new Date(watchlistDob).getFullYear());
  if (diff <= 2) return "partial";
  return "mismatch";
}

function getNatMatch(customerNat: string, watchlistNat: string): "exact" | "mismatch" | "neutral" {
  if (!customerNat || !watchlistNat) return "neutral";
  if (customerNat.toUpperCase() === watchlistNat.toUpperCase()) return "exact";
  return "mismatch";
}

function formatSignal(signal: string) {
  return signal.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function splitAliases(rawAliases: string) {
  return rawAliases
    .split(/[;,]/)
    .map((alias) => alias.trim())
    .filter(Boolean);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getSourceTerms(source: Source) {
  const label = source.label.toLowerCase();

  if (label.includes("financial times")) return ["Financial Times"];
  if (label.includes("south china morning post")) return ["South China Morning Post", "SCMP"];
  if (label.includes("scmp")) return ["SCMP", "South China Morning Post"];
  if (label.includes("reuters")) return ["Reuters"];
  if (label.includes("ofac")) return ["OFAC"];
  if (label.includes("un ")) return ["UN"];
  if (label.includes("eu ")) return ["EU"];
  if (label.includes("dea")) return ["DEA"];

  const baseLabel = source.label.split("—")[0]?.trim();
  return baseLabel ? [baseLabel] : [];
}

function renderAnalysisWithSources(text: string, sources: Source[]) {
  const matches = sources
    .map((source) => {
      for (const term of getSourceTerms(source)) {
        const regex = new RegExp(`\\b${escapeRegExp(term)}\\b`, "i");
        const found = regex.exec(text);
        if (found?.index !== undefined) {
          return {
            source,
            term: found[0],
            start: found.index,
            end: found.index + found[0].length,
          };
        }
      }
      return null;
    })
    .filter((match): match is NonNullable<typeof match> => Boolean(match))
    .sort((a, b) => a.start - b.start);

  const nonOverlappingMatches = matches.filter((match, index) => {
    const previousMatch = matches[index - 1];
    return !previousMatch || match.start >= previousMatch.end;
  });

  if (nonOverlappingMatches.length === 0) {
    return text;
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;

  nonOverlappingMatches.forEach((match, index) => {
    if (match.start > cursor) {
      nodes.push(text.slice(cursor, match.start));
    }

    nodes.push(
      <span key={`${match.source.url}-${match.start}`} className="inline">
        {text.slice(match.start, match.end)}
        <a
          href={match.source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-1 inline-flex size-5.5 translate-y-[1px] items-center justify-center rounded-full border border-default-200 bg-default-50 text-primary shadow-sm transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
          aria-label={`Open source: ${match.source.label}`}
        >
          <ExternalResourceIcon className="size-4" />
        </a>
      </span>
    );

    cursor = match.end;

    if (index === nonOverlappingMatches.length - 1 && cursor < text.length) {
      nodes.push(text.slice(cursor));
    }
  });

  return nodes;
}

function valueTone(match: "exact" | "partial" | "mismatch" | "neutral") {
  switch (match) {
    case "exact":
      return "bg-danger-50 text-foreground";
    case "partial":
      return "bg-warning-50 text-foreground";
    case "mismatch":
      return "bg-success-50 text-foreground";
    default:
      return "bg-default-100 text-foreground";
  }
}

function compareTone(match: "exact" | "partial" | "mismatch" | "neutral") {
  if (match === "partial" || match === "mismatch") {
    return "bg-danger-50 text-foreground";
  }

  return "bg-default-100 text-foreground";
}

function renderHighlightedDifference(
  value: string,
  otherValue: string,
  match: "exact" | "partial" | "mismatch" | "neutral"
) {
  if (!value || !otherValue || match === "exact" || match === "neutral") {
    return value || "—";
  }

  const current = value;
  const other = otherValue;
  const currentLower = current.toLowerCase();
  const otherLower = other.toLowerCase();

  let prefixLength = 0;
  while (
    prefixLength < currentLower.length &&
    prefixLength < otherLower.length &&
    currentLower[prefixLength] === otherLower[prefixLength]
  ) {
    prefixLength += 1;
  }

  let suffixLength = 0;
  while (
    suffixLength < currentLower.length - prefixLength &&
    suffixLength < otherLower.length - prefixLength &&
    currentLower[currentLower.length - 1 - suffixLength] ===
      otherLower[otherLower.length - 1 - suffixLength]
  ) {
    suffixLength += 1;
  }

  const diffEnd = current.length - suffixLength;
  const unchangedPrefix = current.slice(0, prefixLength);
  const changedSegment = current.slice(prefixLength, diffEnd);
  const unchangedSuffix = current.slice(diffEnd);

  if (!changedSegment) {
    return current;
  }

  return (
    <>
      {unchangedPrefix}
      <span className="rounded-sm bg-danger-100 px-0.5 text-foreground">{changedSegment}</span>
      {unchangedSuffix}
    </>
  );
}

function CompareField({
  label,
  foundValue,
  compareValue,
  match,
}: {
  label: string;
  foundValue: string;
  compareValue: string;
  match: "exact" | "partial" | "mismatch" | "neutral";
}) {
  return (
    <div className="grid grid-cols-2 gap-4 pt-3 first:pt-0">
      <div className="space-y-1.5">
        <p className="text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground">
          {label}
        </p>
        <p
          className={`flex w-full justify-start rounded-md px-2 py-1 text-left text-sm font-medium ${valueTone(match)}`}
        >
          {renderHighlightedDifference(foundValue, compareValue, match)}
        </p>
      </div>
      <div className="space-y-1.5">
        <p className="text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground">
          {label}
        </p>
        <p
          className={`flex w-full justify-start rounded-md px-2 py-1 text-left text-sm font-medium ${compareTone(match)}`}
        >
          {renderHighlightedDifference(compareValue, foundValue, match)}
        </p>
      </div>
    </div>
  );
}

function CompositeScoreCard({ layer1 }: { layer1: Layer1Flag }) {
  return (
    <Card className="shrink-0">
      <Card.Content className="gap-3 p-5">
        <div>
          <p className="text-sm font-semibold text-default-700">Composite Score</p>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-5xl font-bold leading-none text-foreground">
            {layer1.composite_score}
          </span>
          <span className="pb-1 text-sm text-default-500">/ 120 max</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-base font-medium text-default-700">
          <span>Name: {(layer1.name_score * 100).toFixed(0)}%</span>
          <span>
            DOB: {layer1.dob_score > 0 ? "+" : ""}
            {layer1.dob_score}
          </span>
          <span>
            Nat: {layer1.nationality_score > 0 ? "+" : ""}
            {layer1.nationality_score}
          </span>
        </div>
      </Card.Content>
    </Card>
  );
}

function FieldComparisonCard({
  customer,
  watchlist,
  layer1,
}: {
  customer: Customer;
  watchlist: SanctionsEntry;
  layer1: Layer1Flag;
}) {
  return (
    <Card className="flex-[1.35]">
      <Card.Content className="gap-4 p-5">
        <div>
          <p className="text-sm font-semibold text-foreground">Field Comparison</p>
        </div>
        <div className="space-y-3">
          <CompareField
            label="Full Name"
            foundValue={customer.full_name}
            compareValue={watchlist.entity_name}
            match={getNameMatch(layer1.name_score)}
          />
          <CompareField
            label="Date of Birth"
            foundValue={customer.dob}
            compareValue={watchlist.dob}
            match={getDobMatch(customer.dob, watchlist.dob)}
          />
          <CompareField
            label="Entity Type"
            foundValue={customer.entity_type}
            compareValue={watchlist.entity_type}
            match={
              customer.entity_type.toLowerCase() === watchlist.entity_type.toLowerCase()
                ? "exact"
                : "mismatch"
            }
          />
          <CompareField
            label="Nationality"
            foundValue={customer.nationality}
            compareValue={watchlist.nationality_country || watchlist.citizenship_country}
            match={getNatMatch(
              customer.nationality,
              watchlist.nationality_country || watchlist.citizenship_country
            )}
          />
        </div>
      </Card.Content>
    </Card>
  );
}

function AliasesCard({ aliases }: { aliases: string[] }) {
  return (
    <Card className="shrink-0">
      <Card.Content className="gap-1.5 p-3">
        <p className="text-sm font-semibold text-default-700">Aliases</p>
        <p className="text-sm text-default-600">
          {aliases.length > 0 ? aliases.join("; ") : "None listed"}
        </p>
      </Card.Content>
    </Card>
  );
}

function ReasoningTrailCard({ result }: { result: Layer2Result }) {
  const riskLevel = getRiskLevel(result.ai_confidence);

  return (
    <Card className="h-full">
      <Card.Content className="flex h-full flex-col gap-5 p-5">
        <div className="space-y-4">
          <p className="text-xl font-semibold text-foreground">AI Reasoning Trail</p>

          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-semibold text-default-700">
              {result.ai_confidence}% Confidence
            </span>
            <span className={`font-medium ${riskLevel.textClassName}`}>{riskLevel.label}</span>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-default-200">
            <div
              className={`h-full rounded-full transition-all ${riskLevel.barClassName}`}
              style={{ width: `${Math.max(6, Math.min(result.ai_confidence, 100))}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-default-700">Analysis</h2>
          <p className="text-base leading-7 text-default-600">
            {renderAnalysisWithSources(result.reasoning, result.sources)}
          </p>
        </div>

        <div className="mt-3 grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-danger">Conflicting Signals</h2>
            <div className="space-y-2">
              {result.conflicting_signals.length > 0 ? (
                result.conflicting_signals.map((signal) => (
                  <div key={signal} className="flex items-start gap-2 text-sm text-default-700">
                    <span
                      className="pt-0.5 text-base font-semibold leading-none text-danger"
                      aria-hidden
                    >
                      ×
                    </span>
                    <span>{formatSignal(signal)}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-default-400">No conflicting signals recorded.</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-success">Matching Signals</h2>
            <div className="space-y-2">
              {result.matching_signals.length > 0 ? (
                result.matching_signals.map((signal) => (
                  <div key={signal} className="flex items-start gap-2 text-sm text-default-700">
                    <span
                      className="pt-0.5 text-base font-semibold leading-none text-success"
                      aria-hidden
                    >
                      ✓
                    </span>
                    <span>{formatSignal(signal)}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-default-400">No matching signals recorded.</p>
              )}
            </div>
          </div>
        </div>
      </Card.Content>
    </Card>
  );
}

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [reviewCase, setReviewCase] = useState<ReviewCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [chatTranscript, setChatTranscript] = useState("");

  useEffect(() => {
    fetch(`/api/screening/review?id=${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Case not found");
        return r.json();
      })
      .then(setReviewCase)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-default-500">Loading case...</p>
      </div>
    );
  }

  if (error || !reviewCase) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-danger">{error || "Case not found"}</p>
        <Link href="/queue">
          <Button variant="outline">Back to Queue</Button>
        </Link>
      </div>
    );
  }

  const { customer, watchlist, layer1, layer2, queue } = reviewCase;
  const aliases = splitAliases(watchlist.entity_aliases);

  return (
    <div className="-m-6 h-[calc(100%+3rem)] overflow-hidden px-6 pb-6 pt-8">
      <div className="mx-auto flex h-full max-w-[1500px] flex-col gap-5">
        <div className="shrink-0">
          <div className="flex items-start gap-3">
            <Button
              variant="ghost"
              isIconOnly
              aria-label="Go back"
              onPress={() => router.back()}
              className="mt-1"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5 8.25 12l7.5-7.5"
                />
              </svg>
            </Button>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {customer.full_name}
              </h1>
              <p className="text-lg text-default-600">
                Case {queue.queue_id} · Matched against {watchlist.entity_name} (
                {watchlist.list_name}, {watchlist.authority})
              </p>
            </div>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(18rem,0.95fr)_minmax(22rem,1.1fr)_minmax(22rem,0.95fr)]">
          <div className="flex min-h-0 flex-col gap-4">
            <CompositeScoreCard layer1={layer1} />
            <FieldComparisonCard customer={customer} watchlist={watchlist} layer1={layer1} />
            <AliasesCard aliases={aliases} />
          </div>

          <div className="min-h-0">
            <ReasoningTrailCard result={layer2} />
          </div>

          <div className="min-h-0">
            <DecisionBar
              className="flex h-full flex-col"
              queueId={queue.queue_id}
              customerName={customer.full_name}
              chatTranscript={chatTranscript}
              onDecisionSubmitted={() => router.push("/queue")}
            />
          </div>
        </div>

        {isAiOpen ? (
          <div className="fixed inset-y-4 right-20 z-30 w-[26rem] max-w-[calc(100vw-7rem)]">
            <div className="flex h-full flex-col rounded-2xl border border-default-200 bg-background p-3 shadow-2xl">
              <div className="mb-3 flex items-center justify-between px-1">
                <div>
                  <p className="text-sm font-semibold text-foreground">AI Assistant</p>
                  <p className="text-xs text-default-500">
                    Ask follow-up questions about this case
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close AI assistant"
                  onClick={() => setIsAiOpen(false)}
                  className="inline-flex size-9 items-center justify-center rounded-xl text-default-500 transition-colors hover:bg-default-100 hover:text-foreground"
                >
                  <svg
                    className="size-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m6 6 12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden rounded-2xl">
                <AIChat queueId={queue.queue_id} onTranscriptUpdate={setChatTranscript} />
              </div>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          aria-label={isAiOpen ? "Close AI assistant" : "Open AI assistant"}
          onClick={() => setIsAiOpen((open) => !open)}
          className={`fixed right-5 top-5 z-40 inline-flex size-12 items-center justify-center rounded-2xl border border-default-200 bg-background text-default-700 shadow-lg transition-colors hover:bg-default-50 hover:text-foreground ${
            isAiOpen ? "bg-default-100 text-foreground" : ""
          }`}
        >
          <SparklesIcon className="size-5" />
        </button>
      </div>
    </div>
  );
}
