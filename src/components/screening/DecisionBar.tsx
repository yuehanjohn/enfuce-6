"use client";

import { useState } from "react";
import { Button, Card } from "@heroui/react";
import { ReasonPicker } from "./ReasonPicker";

interface DecisionBarProps {
  queueId: string;
  customerName: string;
  onDecisionSubmitted?: () => void;
  chatTranscript?: string;
}

export function DecisionBar({
  queueId,
  customerName,
  onDecisionSubmitted,
  chatTranscript,
}: DecisionBarProps) {
  const [decision, setDecision] = useState<"APPROVE" | "REJECT" | null>(null);
  const [reason, setReason] = useState("");
  const [otherText, setOtherText] = useState("");
  const [note, setNote] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const effectiveReason = reason === "Other" ? `Other: ${otherText}` : reason;
  const isValid = decision && reason && note.length >= 10 && (reason !== "Other" || otherText.length > 0);

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
      <Card>
        <Card.Content>
          <div className="flex items-center gap-3 py-4">
            <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <div>
              <p className="font-semibold">Decision Submitted</p>
              <p className="text-sm text-default-500">
                {customerName} — {decision === "APPROVE" ? "Cleared" : "Restricted"} — {effectiveReason}
              </p>
            </div>
          </div>
        </Card.Content>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <Card.Header>
          <Card.Title>Analyst Decision</Card.Title>
        </Card.Header>
        <Card.Content className="space-y-4">
          {/* Decision buttons */}
          <div className="flex gap-3">
            <Button
              className={`flex-1 ${decision === "APPROVE" ? "bg-success text-success-foreground" : ""}`}
              variant={decision === "APPROVE" ? "primary" : "outline"}
              onPress={() => { setDecision("APPROVE"); setReason(""); }}
            >
              <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              Approve (Clear)
            </Button>
            <Button
              className="flex-1"
              variant={decision === "REJECT" ? "danger" : "outline"}
              onPress={() => { setDecision("REJECT"); setReason(""); }}
            >
              <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              Reject (Restrict)
            </Button>
          </div>

          {/* Reason picker */}
          <ReasonPicker
            decision={decision}
            selectedReason={reason}
            onReasonChange={setReason}
            otherText={otherText}
            onOtherTextChange={setOtherText}
          />

          {/* Analyst note */}
          {decision && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-default-700">
                Analyst Note <span className="text-danger">*</span>
                <span className="ml-1 text-xs text-default-400">(min 10 chars)</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Document your rationale for this decision..."
                className="w-full rounded-lg border border-default-200 bg-default-50 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                rows={3}
              />
              <p className="text-xs text-default-400">{note.length}/500 characters</p>
            </div>
          )}

          {/* Submit */}
          {decision && (
            <Button
              variant={decision === "APPROVE" ? "primary" : "danger"}
              className={`w-full ${decision === "APPROVE" ? "bg-success text-success-foreground" : ""}`}
              isDisabled={!isValid}
              onPress={() => setShowConfirm(true)}
            >
              Submit Decision
            </Button>
          )}
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
                <span className={`font-medium ${decision === "APPROVE" ? "text-success" : "text-danger"}`}>
                  {decision === "APPROVE" ? "Approve (Clear)" : "Reject (Restrict)"}
                </span>
              </p>
              <p>
                <span className="text-default-500">Reason:</span>{" "}
                <span className="font-medium">{effectiveReason}</span>
              </p>
              <p>
                <span className="text-default-500">Note:</span>{" "}
                <span>{note}</span>
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onPress={() => setShowConfirm(false)}
              >
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
