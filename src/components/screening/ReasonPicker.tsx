"use client";

import { APPROVE_REASONS, REJECT_REASONS } from "@/types/screening";

interface ReasonPickerProps {
  decision: "APPROVE" | "REJECT" | null;
  selectedReason: string;
  onReasonChange: (reason: string) => void;
  otherText: string;
  onOtherTextChange: (text: string) => void;
}

export function ReasonPicker({
  decision,
  selectedReason,
  onReasonChange,
  otherText,
  onOtherTextChange,
}: ReasonPickerProps) {
  if (!decision) return null;

  const reasons = decision === "APPROVE" ? APPROVE_REASONS : REJECT_REASONS;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-default-700">
        Reason <span className="text-danger">*</span>
      </label>
      <div className="space-y-1.5">
        {reasons.map((reason) => (
          <label
            key={reason}
            className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors ${
              selectedReason === reason
                ? decision === "APPROVE"
                  ? "border-success bg-success-50"
                  : "border-danger bg-danger-50"
                : "border-default-200 hover:bg-default-50"
            }`}
          >
            <input
              type="radio"
              name="reason"
              value={reason}
              checked={selectedReason === reason}
              onChange={() => onReasonChange(reason)}
              className="accent-current"
            />
            <span className="text-sm">{reason}</span>
          </label>
        ))}
      </div>
      {selectedReason === "Other" && (
        <textarea
          value={otherText}
          onChange={(e) => onOtherTextChange(e.target.value)}
          placeholder="Describe your reason..."
          className="mt-2 w-full rounded-lg border border-default-200 bg-default-50 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          rows={2}
        />
      )}
    </div>
  );
}
