"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    fetch("/api/screening/queue")
      .then((r) => r.json())
      .then((data) => {
        setQueue(data.queue);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Review Queue</h1>
          <p className="text-default-500">
            Cases requiring human analyst review (10–90% AI confidence)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-default-500">{queue.length} pending</span>
          <Link href="/screening">
            <Button variant="outline" size="sm">
              Back to Pipeline
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-default-500">Loading queue...</div>
        </div>
      ) : queue.length === 0 ? (
        <Card>
          <Card.Content>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <svg className="h-12 w-12 text-default-300 mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <p className="text-lg font-medium">Queue is empty</p>
              <p className="text-sm text-default-500 mt-1">
                All cases have been reviewed or no screening has been run yet.
              </p>
              <Link href="/screening">
                <Button variant="primary" className="mt-4">
                  Run Screening
                </Button>
              </Link>
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
                      <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.status === "PENDING"
                          ? "bg-warning-50 text-warning"
                          : item.status === "IN_REVIEW"
                            ? "bg-primary-50 text-primary"
                            : "bg-success-50 text-success"
                      }`}>
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
