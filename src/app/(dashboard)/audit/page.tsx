"use client";

import { useEffect, useState } from "react";
import { Card, Button } from "@heroui/react";
import Link from "next/link";

interface AuditEntry {
  log_id: string;
  customer_id: string;
  layer: number;
  event_type: string;
  payload: Record<string, unknown>;
  analyst_id: string | null;
  ai_chat_transcript: string | null;
  created_at: string;
}

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/screening/audit")
      .then((r) => r.json())
      .then((data) => {
        setEntries(data.entries);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function getEventColor(eventType: string) {
    if (eventType.includes("RESTRICT")) return "text-danger bg-danger-50";
    if (eventType.includes("CLEAR")) return "text-success bg-success-50";
    if (eventType.includes("HUMAN_REVIEW")) return "text-warning bg-warning-50";
    if (eventType.includes("SCREENING")) return "text-primary bg-primary-50";
    return "text-default-600 bg-default-100";
  }

  function getLayerLabel(layer: number) {
    switch (layer) {
      case 1: return "Layer 1 — Hard Rules";
      case 2: return "Layer 2 — AI Analysis";
      case 3: return "Layer 3 — Human Decision";
      default: return `Layer ${layer}`;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-default-500">
            Immutable record of all screening decisions and actions
          </p>
        </div>
        <Link href="/screening">
          <Button variant="outline" size="sm">
            Back to Pipeline
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-default-500">Loading audit log...</p>
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <Card.Content>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-lg font-medium">No audit entries yet</p>
              <p className="text-sm text-default-500 mt-1">
                Run the screening pipeline to generate audit records.
              </p>
            </div>
          </Card.Content>
        </Card>
      ) : (
        <Card>
          <Card.Content className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-default-200 bg-default-50">
                    <th className="px-4 py-3 text-left font-medium text-default-500">Timestamp</th>
                    <th className="px-4 py-3 text-left font-medium text-default-500">Layer</th>
                    <th className="px-4 py-3 text-left font-medium text-default-500">Event</th>
                    <th className="px-4 py-3 text-left font-medium text-default-500">Customer</th>
                    <th className="px-4 py-3 text-left font-medium text-default-500">Analyst</th>
                    <th className="px-4 py-3 text-left font-medium text-default-500">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <>
                      <tr
                        key={entry.log_id}
                        className="border-b border-default-100 hover:bg-default-50 cursor-pointer"
                        onClick={() => setExpandedId(expandedId === entry.log_id ? null : entry.log_id)}
                      >
                        <td className="px-4 py-3 text-xs text-default-500 whitespace-nowrap">
                          {new Date(entry.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs">{getLayerLabel(entry.layer)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getEventColor(entry.event_type)}`}>
                            {entry.event_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium">{entry.customer_id}</td>
                        <td className="px-4 py-3 text-default-500">
                          {entry.analyst_id || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="sm">
                            {expandedId === entry.log_id ? "Hide" : "View"}
                          </Button>
                        </td>
                      </tr>
                      {expandedId === entry.log_id && (
                        <tr key={`${entry.log_id}-detail`}>
                          <td colSpan={6} className="px-4 py-4 bg-default-50">
                            <pre className="text-xs overflow-x-auto whitespace-pre-wrap rounded-lg bg-default-100 p-4">
                              {JSON.stringify(entry.payload, null, 2)}
                            </pre>
                            {entry.ai_chat_transcript && (
                              <div className="mt-3">
                                <p className="text-xs font-medium text-default-500 mb-1">Chat Transcript</p>
                                <pre className="text-xs overflow-x-auto whitespace-pre-wrap rounded-lg bg-default-100 p-4">
                                  {entry.ai_chat_transcript}
                                </pre>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </Card.Content>
        </Card>
      )}
    </div>
  );
}
