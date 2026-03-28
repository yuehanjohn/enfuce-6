"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { FieldComparison } from "@/components/screening/FieldComparison";
import { ReasoningPanel } from "@/components/screening/ReasoningPanel";
import { AIChat } from "@/components/screening/AIChat";
import { DecisionBar } from "@/components/screening/DecisionBar";
import type { ReviewCase } from "@/types/screening";
import Link from "next/link";

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-default-500">Loading case...</p>
      </div>
    );
  }

  if (error || !reviewCase) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-danger">{error || "Case not found"}</p>
        <Link href="/queue">
          <Button variant="outline">Back to Queue</Button>
        </Link>
      </div>
    );
  }

  const { customer, watchlist, layer1, layer2, queue } = reviewCase;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/queue">
              <Button variant="ghost" size="sm" isIconOnly>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">{customer.full_name}</h1>
            <span className="inline-flex items-center rounded-full bg-warning-50 px-2.5 py-0.5 text-xs font-medium text-warning">
              {queue.status}
            </span>
          </div>
          <p className="text-sm text-default-500 ml-11">
            Case {queue.queue_id} · Matched against {watchlist.entity_name} ({watchlist.authority})
          </p>
        </div>
      </div>

      {/* Main three-panel layout */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left — Field Comparison */}
        <div>
          <FieldComparison customer={customer} watchlist={watchlist} layer1={layer1} />
        </div>

        {/* Center — AI Reasoning */}
        <div>
          <ReasoningPanel result={layer2} />
        </div>

        {/* Right — AI Chat */}
        <div>
          <AIChat queueId={queue.queue_id} onTranscriptUpdate={handleTranscriptUpdate} />
        </div>
      </div>

      {/* Decision Bar — Full width below */}
      <DecisionBar
        queueId={queue.queue_id}
        customerName={customer.full_name}
        chatTranscript={chatTranscript}
        onDecisionSubmitted={() => router.push("/queue")}
      />
    </div>
  );
}
