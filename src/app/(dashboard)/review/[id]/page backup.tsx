"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { FieldComparison } from "@/components/screening/FieldComparison";
import { ReasoningPanel } from "@/components/screening/ReasoningPanel";
import { AIChat } from "@/components/screening/AIChat";
import { DecisionBar } from "@/components/screening/DecisionBar";
import type { ReviewCase, QueueStatus } from "@/types/screening";
import Link from "next/link";

const STATUS_STYLES: Record<QueueStatus, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-warning-50 text-warning border border-warning-200" },
  IN_REVIEW: {
    label: "In Review",
    className: "bg-primary-50 text-primary border border-primary-200",
  },
  DECIDED: {
    label: "Decided",
    className: "bg-default-100 text-default-500 border border-default-200",
  },
};

function ReviewSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-default-200" />
        <div className="h-7 w-48 rounded-lg bg-default-200" />
        <div className="h-5 w-20 rounded-full bg-default-200" />
      </div>
      <div className="h-4 w-72 rounded bg-default-100 ml-11" />
      <div className="grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-96 rounded-2xl bg-default-100" />
        ))}
      </div>
      <div className="h-40 rounded-2xl bg-default-100" />
    </div>
  );
}

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [reviewCase, setReviewCase] = useState<ReviewCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const handleTranscriptUpdate = useCallback((transcript: string) => {
    setChatTranscript(transcript);
  }, []);

  if (loading) return <ReviewSkeleton />;

  if (error || !reviewCase) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-50">
          <svg
            className="h-6 w-6 text-danger"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-danger">{error || "Case not found"}</p>
        <Link href="/queue">
          <Button variant="outline" size="sm">
            Back to Queue
          </Button>
        </Link>
      </div>
    );
  }

  const { customer, watchlist, layer1, layer2, queue } = reviewCase;
  const statusStyle = STATUS_STYLES[queue.status];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/queue">
              <Button variant="ghost" size="sm" isIconOnly>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 19.5 8.25 12l7.5-7.5"
                  />
                </svg>
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-default-900">{customer.full_name}</h1>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle.className}`}
            >
              {statusStyle.label}
            </span>
          </div>
          <p className="text-sm text-default-500 mt-1 ml-11">
            Case{" "}
            <span className="font-mono text-xs bg-default-100 px-1.5 py-0.5 rounded">
              {queue.queue_id}
            </span>{" "}
            · Matched against{" "}
            <span className="font-medium text-default-700">{watchlist.entity_name}</span>
            <span className="text-default-400"> ({watchlist.authority})</span>
          </p>
        </div>

        {/* Quick-glance risk score */}
        <div
          className={`shrink-0 flex items-center gap-2 rounded-xl border px-3 py-2 ${
            queue.ai_confidence >= 80
              ? "bg-danger-50 border-danger-200"
              : queue.ai_confidence >= 60
                ? "bg-warning-50 border-warning-200"
                : "bg-success-50 border-success-200"
          }`}
        >
          <span
            className={`text-xl font-bold tabular-nums ${
              queue.ai_confidence >= 80
                ? "text-danger"
                : queue.ai_confidence >= 60
                  ? "text-warning"
                  : "text-success"
            }`}
          >
            {queue.ai_confidence}%
          </span>
          <span className="text-xs text-default-500 leading-tight">
            AI
            <br />
            Risk
          </span>
        </div>
      </div>

      {/* Main three-panel layout */}
      <div className="grid gap-4 lg:grid-cols-3 items-stretch">
        <FieldComparison customer={customer} watchlist={watchlist} layer1={layer1} />
        <ReasoningPanel result={layer2} />
        <AIChat queueId={queue.queue_id} onTranscriptUpdate={handleTranscriptUpdate} />
      </div>

      {/* Decision bar */}
      <DecisionBar
        queueId={queue.queue_id}
        customerName={customer.full_name}
        chatTranscript={chatTranscript}
        onDecisionSubmitted={() => router.push("/queue")}
      />
    </div>
  );
}
