"use client";

import { useState } from "react";
import { Button, Card } from "@heroui/react";
import type { Layer1Flag } from "@/types/screening";

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
  const [layer2Summary, setLayer2Summary] = useState<Layer2Summary | null>(null);
  const [customersScreened, setCustomersScreened] = useState(0);
  const [layer2Progress, setLayer2Progress] = useState<{ processed: number; total: number } | null>(
    null
  );
  const [layer2ModeCounts, setLayer2ModeCounts] = useState<{ fast: number; deep: number }>({
    fast: 0,
    deep: 0,
  });

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
    setLayer2Summary(null);
    setLayer2ModeCounts({ fast: 0, deep: 0 });
    setLayer2Progress({ processed: 0, total: layer1Flags.length });
    try {
      const maxCases = 300;
      let sessionId = "";
      let finalSummary: Layer2Summary | null = null;

      const firstClaimRes = await fetch("/api/screening/workers/claim-next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true, maxCases }),
      });
      if (!firstClaimRes.ok) {
        throw new Error(`Failed to initialize worker session (${firstClaimRes.status})`);
      }

      let claimData = (await firstClaimRes.json()) as {
        sessionId: string;
        claim: { index: number } | null;
      };
      sessionId = claimData.sessionId;

      while (claimData.claim) {
        const processRes = await fetch("/api/screening/workers/process-one", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            claimIndex: claimData.claim.index,
          }),
        });

        if (!processRes.ok) {
          throw new Error(`Failed processing case (${processRes.status})`);
        }

        const processData = (await processRes.json()) as {
          success: boolean;
          mode?: "fast" | "deep";
        };

        if (processData.success) {
          if (processData.mode === "fast" || processData.mode === "deep") {
            setLayer2ModeCounts((prev) => ({
              ...prev,
              [processData.mode!]: prev[processData.mode!] + 1,
            }));
          }
        }

        const statusRes = await fetch(
          `/api/screening/workers/status?sessionId=${encodeURIComponent(sessionId)}`
        );
        if (!statusRes.ok) {
          throw new Error(`Failed fetching worker status (${statusRes.status})`);
        }
        const statusData = (await statusRes.json()) as {
          progress: { processed: number; total: number; hasMore: boolean };
          summary: Layer2Summary;
        };
        setLayer2Progress({
          processed: statusData.progress.processed,
          total: statusData.progress.total,
        });

        setLayer2Summary(statusData.summary);
        finalSummary = statusData.summary;

        if (!statusData.progress.hasMore) {
          break;
        }

        const nextClaimRes = await fetch("/api/screening/workers/claim-next", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        if (!nextClaimRes.ok) {
          throw new Error(`Failed to claim next case (${nextClaimRes.status})`);
        }
        claimData = (await nextClaimRes.json()) as {
          sessionId: string;
          claim: { index: number } | null;
        };
      }

      setStage("layer2_done");
      setLayer2Progress(null);

      if ((finalSummary?.human_review ?? 0) > 0) {
        window.location.href = "/queue";
      }
    } catch {
      setStage("layer1_done");
      setLayer2Progress(null);
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
              <div className="space-y-2">
                <Button variant="primary" className="w-full" isDisabled>
                  Processing {layer2Progress?.processed ?? 0}/
                  {layer2Progress?.total ?? layer1Flags.length} cases...
                </Button>
                <p className="text-xs text-default-500 text-center">
                  Cases are processed one-by-one. HUMAN_REVIEW cases are sent directly to the Review
                  Queue.
                </p>
                <p className="text-xs text-default-500 text-center">
                  Fast pass: {layer2ModeCounts.fast} | Deep pass: {layer2ModeCounts.deep}
                </p>
              </div>
            )}
            {stage === "layer2_done" && (
              <p className="text-xs text-default-500 text-center">
                Fast pass: {layer2ModeCounts.fast} | Deep pass: {layer2ModeCounts.deep}
              </p>
            )}
            {stage === "layer2_done" && layer2Summary && (
              <div className="space-y-2">
                <div className="rounded-lg bg-success-50 p-3 text-sm">
                  <p className="font-medium text-success">AI Processing Complete</p>
                  <p className="text-default-600">
                    Review-required cases were routed automatically to the Review Queue.
                  </p>
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

      {(stage === "layer2" || stage === "layer2_done") && (
        <Card>
          <Card.Content>
            <div className="rounded-lg bg-default-50 p-4 text-sm text-default-600">
              Individual case outputs are not displayed on this page. Analysts should use the Review
              Queue for manual decisions.
            </div>
          </Card.Content>
        </Card>
      )}
    </div>
  );
}
