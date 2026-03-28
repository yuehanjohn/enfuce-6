"use client";

import { useState } from "react";
import { Button, Card } from "@heroui/react";
import { ConfidenceMeter } from "@/components/screening/ConfidenceMeter";
import type { Layer1Flag, Layer2Result } from "@/types/screening";

type Stage = "idle" | "layer1" | "layer1_done" | "layer2" | "layer2_done";

interface Layer2Summary {
  total: number;
  auto_restrict: number;
  auto_clear: number;
  human_review: number;
}

export default function ScreeningPage() {
  const [stage, setStage] = useState<Stage>("idle");
  const [layer1Flags, setLayer1Flags] = useState<Layer1Flag[]>([]);
  const [layer2Results, setLayer2Results] = useState<Layer2Result[]>([]);
  const [layer2Summary, setLayer2Summary] = useState<Layer2Summary | null>(null);
  const [customersScreened, setCustomersScreened] = useState(0);

  async function runLayer1() {
    setStage("layer1");
    try {
      const res = await fetch("/api/screening/run", { method: "POST" });
      const data = await res.json();
      setLayer1Flags(data.flags);
      setCustomersScreened(data.customers_screened);
      setStage("layer1_done");
    } catch {
      setStage("idle");
    }
  }

  async function runLayer2() {
    setStage("layer2");
    try {
      const res = await fetch("/api/screening/layer2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mock: false }),
      });
      const data = await res.json();
      setLayer2Results(data.results);
      setLayer2Summary(data.summary);
      setStage("layer2_done");
    } catch {
      setStage("layer1_done");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sanctions & PEP Screening</h1>
        <p className="text-default-500">Three-layer screening pipeline for customer onboarding</p>
      </div>

      {/* Pipeline Visualization */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Layer 1 */}
        <Card className={stage === "layer1" ? "border-2 border-primary" : ""}>
          <Card.Header>
            <div className="flex w-full items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  stage === "idle"
                    ? "bg-default-200 text-default-500"
                    : stage === "layer1"
                      ? "bg-primary text-white"
                      : "bg-success text-white"
                }`}
              >
                1
              </div>
              <Card.Title>Hard Rule Engine</Card.Title>
            </div>
          </Card.Header>
          <Card.Content>
            <p className="text-sm text-default-500 mb-4">
              Deterministic SQL-based screening. Fuzzy name match + DOB + nationality scoring
              against{" "}
              <code className="text-xs bg-default-100 px-1 rounded">
                GLOBAL_SANCTIONS_DATA.SANCTIONS_DATAFEED
              </code>
            </p>
            {stage === "idle" && (
              <Button variant="primary" className="w-full" onPress={runLayer1}>
                Run Layer 1 Screening
              </Button>
            )}
            {stage === "layer1" && (
              <Button variant="primary" className="w-full" isDisabled>
                Screening...
              </Button>
            )}
            {(stage === "layer1_done" || stage === "layer2" || stage === "layer2_done") && (
              <div className="space-y-2">
                <div className="rounded-lg bg-success-50 p-3 text-sm">
                  <p className="font-medium text-success">Screening Complete</p>
                  <p className="text-default-600">
                    {customersScreened.toLocaleString()} customers screened
                  </p>
                  <p className="text-default-600 font-semibold">
                    {layer1Flags.length} flagged for AI review
                  </p>
                </div>
              </div>
            )}
          </Card.Content>
        </Card>

        {/* Layer 2 */}
        <Card className={stage === "layer2" ? "border-2 border-primary" : ""}>
          <Card.Header>
            <div className="flex w-full items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  ["idle", "layer1"].includes(stage)
                    ? "bg-default-200 text-default-500"
                    : stage === "layer2"
                      ? "bg-primary text-white"
                      : "bg-success text-white"
                }`}
              >
                2
              </div>
              <Card.Title>AI Warehouse</Card.Title>
            </div>
          </Card.Header>
          <Card.Content>
            <p className="text-sm text-default-500 mb-4">
              Snowflake Cortex AI + Brave Search researches each flagged case. Produces reasoning
              trail + confidence score + routing decision.
            </p>
            {stage === "layer1_done" && (
              <Button variant="primary" className="w-full" onPress={runLayer2}>
                Process with AI
              </Button>
            )}
            {stage === "layer2" && (
              <Button variant="primary" className="w-full" isDisabled>
                Processing {layer1Flags.length} cases...
              </Button>
            )}
            {stage === "layer2_done" && layer2Summary && (
              <div className="space-y-2">
                <div className="rounded-lg bg-success-50 p-3 text-sm">
                  <p className="font-medium text-success">AI Processing Complete</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-lg bg-danger-50 p-2">
                    <p className="text-lg font-bold text-danger">{layer2Summary.auto_restrict}</p>
                    <p className="text-xs text-default-500">Auto-Restrict</p>
                  </div>
                  <div className="rounded-lg bg-success-50 p-2">
                    <p className="text-lg font-bold text-success">{layer2Summary.auto_clear}</p>
                    <p className="text-xs text-default-500">Auto-Clear</p>
                  </div>
                  <div className="rounded-lg bg-warning-50 p-2">
                    <p className="text-lg font-bold text-warning">{layer2Summary.human_review}</p>
                    <p className="text-xs text-default-500">Human Review</p>
                  </div>
                </div>
              </div>
            )}
            {["idle", "layer1"].includes(stage) && (
              <div className="text-sm text-default-400 text-center py-2">
                Waiting for Layer 1...
              </div>
            )}
          </Card.Content>
        </Card>

        {/* Layer 3 */}
        <Card>
          <Card.Header>
            <div className="flex w-full items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  stage === "layer2_done"
                    ? "bg-warning text-white"
                    : "bg-default-200 text-default-500"
                }`}
              >
                3
              </div>
              <Card.Title>Human Review</Card.Title>
            </div>
          </Card.Header>
          <Card.Content>
            <p className="text-sm text-default-500 mb-4">
              Analyst dashboard for 10–90% confidence cases. Full reasoning trail, source links, and
              AI chat assistant.
            </p>
            {stage === "layer2_done" && layer2Summary ? (
              <a href="/queue">
                <Button variant="primary" className="w-full bg-warning text-warning-foreground">
                  Open Review Queue ({layer2Summary.human_review} cases)
                </Button>
              </a>
            ) : (
              <div className="text-sm text-default-400 text-center py-2">
                Waiting for Layer 2...
              </div>
            )}
          </Card.Content>
        </Card>
      </div>

      {/* Layer 2 Results Table */}
      {stage === "layer2_done" && layer2Results.length > 0 && (
        <Card>
          <Card.Header>
            <Card.Title>Layer 2 Results</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-default-200 text-left">
                    <th className="pb-3 font-medium text-default-500">Customer</th>
                    <th className="pb-3 font-medium text-default-500">Watchlist Match</th>
                    <th className="pb-3 font-medium text-default-500">AI Confidence</th>
                    <th className="pb-3 font-medium text-default-500">Routing</th>
                  </tr>
                </thead>
                <tbody>
                  {layer2Results.map((r) => (
                    <tr key={r.result_id} className="border-b border-default-100">
                      <td className="py-3 font-medium">{r.customer_id}</td>
                      <td className="py-3">{r.entity_id}</td>
                      <td className="py-3 w-48">
                        <ConfidenceMeter confidence={r.ai_confidence} size="sm" />
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            r.routing === "AUTO_RESTRICT"
                              ? "bg-danger-50 text-danger"
                              : r.routing === "AUTO_CLEAR"
                                ? "bg-success-50 text-success"
                                : "bg-warning-50 text-warning"
                          }`}
                        >
                          {r.routing.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
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
