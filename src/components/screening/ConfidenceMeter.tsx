"use client";

interface ConfidenceMeterProps {
  confidence: number;
  size?: "sm" | "md" | "lg";
}

export function ConfidenceMeter({ confidence, size = "md" }: ConfidenceMeterProps) {
  const getColor = () => {
    if (confidence >= 80) return "bg-danger";
    if (confidence >= 60) return "bg-warning";
    if (confidence >= 40) return "bg-yellow-500";
    return "bg-success";
  };

  const getTextColor = () => {
    if (confidence >= 80) return "text-danger";
    if (confidence >= 60) return "text-warning";
    if (confidence >= 40) return "text-yellow-500";
    return "text-success";
  };

  const getLabel = () => {
    if (confidence >= 90) return "Very High Risk";
    if (confidence >= 70) return "High Risk";
    if (confidence >= 50) return "Moderate Risk";
    if (confidence >= 30) return "Low Risk";
    if (confidence >= 10) return "Very Low Risk";
    return "Minimal Risk";
  };

  const heights = { sm: "h-2", md: "h-3", lg: "h-4" };
  const textSizes = { sm: "text-xs", md: "text-sm", lg: "text-base" };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className={`font-semibold ${textSizes[size]} ${getTextColor()}`}>
          {confidence}% Confidence
        </span>
        <span className={`${textSizes[size]} text-default-500`}>{getLabel()}</span>
      </div>
      <div className={`w-full rounded-full bg-default-200 ${heights[size]}`}>
        <div
          className={`${heights[size]} rounded-full transition-all duration-500 ${getColor()}`}
          style={{ width: `${confidence}%` }}
        />
      </div>
    </div>
  );
}
