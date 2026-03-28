"use client";

import { useState } from "react";
import { Button, Card } from "@heroui/react";
import { ReasonPicker } from "./ReasonPicker";

interface DecisionBarProps {
  queueId: string;
  customerName: string;
  onDecisionSubmitted?: () => void;
  chatTranscript?: string;
  className?: string;
}

export function DecisionBar({
  queueId,
  customerName,
  onDecisionSubmitted,
  chatTranscript,
  className,
}: DecisionBarProps) {
  const [decision, setDecision] = useState<"APPROVE" | "REJECT" | null>(null);
  const [reason, setReason] = useState("");
  const [otherText, setOtherText] = useState("");
  const [note, setNote] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const effectiveReason = reason === "Other" ? `Other: ${otherText}` : reason;
  const isValid =
    decision && reason && note.length >= 10 && (reason !== "Other" || otherText.length > 0);

  async function handleSubmit() {
    if (!isValid) return;
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/screening/review/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queue_id: queueId,
          decision,
          reason_category: effectiveReason,
          analyst_note: note,
          chat_transcript: chatTranscript,
        }),
      });

      if (!response.ok) throw new Error("Failed to submit decision");

      setSubmitted(true);
      setShowConfirm(false);
      onDecisionSubmitted?.();
    } catch (error) {
      console.error("Decision error:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Card className={className}>
        <Card.Content className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto p-5">
          <div className="space-y-4">
            <p className="text-xl font-semibold text-foreground">Analyst Decision</p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-success/20 bg-success-50 px-4 py-4">
            <svg
              className="h-8 w-8 text-success"
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
            <div>
              <p className="font-semibold text-success">Decision Submitted</p>
              <p className="text-sm text-default-600">
                {customerName} - {decision === "APPROVE" ? "Cleared" : "Restricted"} -{" "}
                {effectiveReason}
              </p>
            </div>
          </div>
        </Card.Content>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <Card.Content className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto p-5">
          <div className="space-y-4">
            <p className="text-xl font-semibold text-foreground">Analyst Decision</p>

            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-semibold text-default-700">
                {decision === "APPROVE"
                  ? "Approve (Clear)"
                  : decision === "REJECT"
                    ? "Reject (Restrict)"
                    : "Decision Pending"}
              </span>
              <span
                className={`font-medium ${
                  decision === "APPROVE"
                    ? "text-success"
                    : decision === "REJECT"
                      ? "text-danger"
                      : "text-default-500"
                }`}
              >
                {decision ? "Selected" : "Required"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-xl bg-default-100 p-1">
              <Button
                className={`w-full justify-center ${
                  decision === "APPROVE"
                    ? "bg-success text-success-foreground shadow-sm"
                    : "bg-background text-default-700"
                }`}
                variant={decision === "APPROVE" ? "primary" : "ghost"}
                onPress={() => {
                  setDecision("APPROVE");
                  setReason("");
                }}
              >
                <svg
                  className="mr-1 h-4 w-4"
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
                Approve
              </Button>
              <Button
                className={`w-full justify-center ${
                  decision === "REJECT" ? "shadow-sm" : "bg-background text-default-700"
                }`}
                variant={decision === "REJECT" ? "danger" : "ghost"}
                onPress={() => {
                  setDecision("REJECT");
                  setReason("");
                }}
              >
                <svg
                  className="mr-1 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
                Reject
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <ReasonPicker
              decision={decision}
              selectedReason={reason}
              onReasonChange={setReason}
              otherText={otherText}
              onOtherTextChange={setOtherText}
            />
          </div>

          {decision ? (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-default-700">
                Analyst Note <span className="text-danger">*</span>
                <span className="ml-1 text-xs font-normal text-default-400">(min 10 chars)</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Document your rationale for this decision..."
                className="w-full rounded-xl border border-default-200 bg-default-50 px-3 py-2 text-sm leading-6 text-default-700 focus:border-primary focus:outline-none"
                rows={4}
              />
              <p className="text-xs text-default-400">{note.length}/500 characters</p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-default-200 px-4 py-4 text-sm text-default-400">
              Select an approve or reject decision to continue.
            </div>
          )}

          <Button
            variant={decision === "REJECT" ? "danger" : "primary"}
            className={`mt-auto w-full rounded-xl px-4 py-3 shadow-sm ${decision === "APPROVE" ? "bg-success text-success-foreground" : ""}`}
            isDisabled={!isValid}
            onPress={() => setShowConfirm(true)}
          >
            Submit Decision
          </Button>
        </Card.Content>
      </Card>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-background p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Confirm Decision</h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-default-500">Customer:</span>{" "}
                <span className="font-medium">{customerName}</span>
              </p>
              <p>
                <span className="text-default-500">Decision:</span>{" "}
                <span
                  className={`font-medium ${decision === "APPROVE" ? "text-success" : "text-danger"}`}
                >
                  {decision === "APPROVE" ? "Approve (Clear)" : "Reject (Restrict)"}
                </span>
              </p>
              <p>
                <span className="text-default-500">Reason:</span>{" "}
                <span className="font-medium">{effectiveReason}</span>
              </p>
              <p>
                <span className="text-default-500">Note:</span> <span>{note}</span>
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1" onPress={() => setShowConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant={decision === "APPROVE" ? "primary" : "danger"}
                className={`flex-1 ${decision === "APPROVE" ? "bg-success text-success-foreground" : ""}`}
                isDisabled={isSubmitting}
                onPress={handleSubmit}
              >
                {isSubmitting ? "Submitting..." : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
