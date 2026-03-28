"use client";

import { Card } from "@heroui/react";
import type { Layer2Result } from "@/types/screening";
import { ConfidenceMeter } from "./ConfidenceMeter";
import { SourceList } from "./SourceList";

interface ReasoningPanelProps {
  result: Layer2Result;
}

export function ReasoningPanel({ result }: ReasoningPanelProps) {
  return (
    <Card className="h-full">
      <Card.Header>
        <Card.Title>AI Reasoning Trail</Card.Title>
      </Card.Header>
      <Card.Content className="space-y-5">
        {/* Combined Score (primary routing signal) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-default-500 uppercase tracking-wide">
              Combined Score
            </span>
            <span className="text-xs text-default-400">
              AI {result.ai_confidence}% · Layer 1 (30%) + AI (70%)
            </span>
          </div>
          <ConfidenceMeter confidence={result.combined_score} size="lg" />
        </div>

        {/* Online Research — Customer Background */}
        {result.customer_background && (
          <div className="rounded-lg border border-default-200 bg-default-50 p-3">
            <h4 className="text-xs font-semibold text-default-500 uppercase tracking-wide mb-1">
              Online Research — Customer
            </h4>
            <p className="text-sm text-default-700 leading-relaxed">{result.customer_background}</p>
          </div>
        )}

        {/* Online Research — Sanctions Entity Background */}
        {result.sanctions_background && (
          <div className="rounded-lg border border-default-200 bg-default-50 p-3">
            <h4 className="text-xs font-semibold text-default-500 uppercase tracking-wide mb-1">
              Online Research — Sanctions Entity
            </h4>
            <p className="text-sm text-default-700 leading-relaxed">
              {result.sanctions_background}
            </p>
          </div>
        )}

        {/* Full Reasoning Narrative */}
        <div>
          <h4 className="text-sm font-semibold text-default-700 mb-2">Full Analysis</h4>
          <p className="text-sm text-default-600 leading-relaxed whitespace-pre-line">
            {result.reasoning}
          </p>
        </div>

        {/* Matching Signals */}
        {result.matching_signals.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-danger mb-2">Matching Signals</h4>
            <div className="flex flex-wrap gap-2">
              {result.matching_signals.map((signal) => (
                <span
                  key={signal}
                  className="inline-flex items-center gap-1 rounded-full bg-danger-50 px-2.5 py-1 text-xs font-medium text-danger"
                >
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126Z"
                    />
                  </svg>
                  {signal}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Conflicting Signals */}
        {result.conflicting_signals.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-success mb-2">Conflicting Signals</h4>
            <div className="flex flex-wrap gap-2">
              {result.conflicting_signals.map((signal) => (
                <span
                  key={signal}
                  className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2.5 py-1 text-xs font-medium text-success"
                >
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                  {signal}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Sources */}
        <div>
          <h4 className="text-sm font-semibold text-default-700 mb-2">Sources</h4>
          <SourceList sources={result.sources} />
        </div>
      </Card.Content>
    </Card>
  );
}
