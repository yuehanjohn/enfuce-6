"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, Button } from "@heroui/react";
import { ConfidenceMeter } from "@/components/screening/ConfidenceMeter";
import Link from "next/link";

interface QueueEntry {
  queue_id: string;
  result_id: string;
  customer_id: string;
  entity_id: string;
  ai_confidence: number;
  status: string;
  queued_at: string;
  customer_name: string;
  customer_nationality: string;
  customer_dob: string;
  entity_name: string;
  list_source: string;
  reasoning_summary: string;
}

export default function QueuePage() {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pipelineStage, setPipelineStage] = useState<string>("idle");
  const [totalDecided, setTotalDecided] = useState(0);
  const initialLoadDone = useRef(false);

  const loadQueue = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch("/api/screening/queue", { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Queue request failed (${response.status})`);
      }
      const data = await response.json();
      setQueue(Array.isArray(data.queue) ? data.queue : []);
      if (data.stage) setPipelineStage(data.stage);
      if (typeof data.totalDecided === "number") setTotalDecided(data.totalDecided);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        if (!initialLoadDone.current) setError("Queue request timed out. Please retry.");
      } else {
        if (!initialLoadDone.current) setError("Failed to load queue. Please retry.");
      }
    } finally {
      clearTimeout(timeout);
      setLoading(false);
      initialLoadDone.current = true;
    }
  }, []);

  useEffect(() => {
    void loadQueue(true);

    // Auto-poll every 3 seconds so new cases from Layer 2 appear in real-time
    const interval = setInterval(() => {
      void loadQueue(false);
    }, 3000);

    return () => clearInterval(interval);
  }, [loadQueue]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Review Queue</h1>
          <p className="text-default-500">
            Cases requiring human analyst review (10–90% AI confidence)
          </p>
        </div>
        <span className="text-sm text-default-500">{queue.length} pending</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-default-500">Loading queue...</div>
        </div>
      ) : error ? (
        <Card>
          <Card.Content>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-lg font-medium">Queue unavailable</p>
              <p className="text-sm text-default-500 mt-1">{error}</p>
              <Button variant="primary" className="mt-4" onPress={() => loadQueue(true)}>
                Retry
              </Button>
            </div>
          </Card.Content>
        </Card>
      ) : queue.length === 0 ? (
        <Card>
          <Card.Content>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              {pipelineStage === "idle" ? (
                <>
                  <svg
                    className="h-12 w-12 text-default-300 mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                  <p className="text-lg font-medium">Queue is empty</p>
                  <p className="text-sm text-default-500 mt-1">
                    Click the <strong>Activate</strong> button on the sidebar to activate the
                    server.
                  </p>
                </>
              ) : pipelineStage === "server" ||
                pipelineStage === "layer1" ||
                pipelineStage === "layer2" ? (
                <>
                  <div className="h-12 w-12 mb-4 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                  <p className="text-lg font-medium">Processing cases</p>
                  <p className="text-sm text-default-500 mt-1">
                    The screening pipeline is still running. New cases will appear here
                    automatically.
                  </p>
                </>
              ) : totalDecided > 0 ? (
                <>
                  <svg
                    className="h-12 w-12 text-success mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                  <p className="text-lg font-medium">All cases reviewed</p>
                  <p className="text-sm text-default-500 mt-1">
                    All {totalDecided} queued {totalDecided === 1 ? "case has" : "cases have"} been
                    decided. No pending reviews remaining.
                  </p>
                </>
              ) : (
                <>
                  <svg
                    className="h-12 w-12 text-default-300 mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                  <p className="text-lg font-medium">No cases for review</p>
                  <p className="text-sm text-default-500 mt-1">
                    All flagged cases were automatically resolved. No human review needed.
                  </p>
                </>
              )}
            </div>
          </Card.Content>
        </Card>
      ) : (
        <div className="space-y-3">
          {queue.map((item) => (
            <Card key={item.queue_id} className="transition-shadow hover:shadow-md">
              <Card.Content>
                <div className="flex items-center gap-6">
                  {/* Customer info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{item.customer_name}</h3>
                      <span
                        className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.status === "PENDING"
                            ? "bg-warning-50 text-warning"
                            : item.status === "IN_REVIEW"
                              ? "bg-primary-50 text-primary"
                              : "bg-success-50 text-success"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <p className="text-sm text-default-500 mt-0.5">
                      {item.customer_id} · {item.customer_nationality} · DOB: {item.customer_dob}
                    </p>
                  </div>

                  {/* Match info */}
                  <div className="hidden md:block flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.entity_name}</p>
                    <p className="text-xs text-default-500">{item.list_source}</p>
                  </div>

                  {/* Confidence */}
                  <div className="w-44 shrink-0">
                    <ConfidenceMeter confidence={item.ai_confidence} size="sm" />
                  </div>

                  {/* Action */}
                  <Link href={`/review/${item.queue_id}`}>
                    <Button variant="primary" size="sm">
                      Review
                    </Button>
                  </Link>
                </div>

                {/* Reasoning summary */}
                <p className="mt-2 text-xs text-default-400 line-clamp-2">
                  {item.reasoning_summary}...
                </p>
              </Card.Content>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
