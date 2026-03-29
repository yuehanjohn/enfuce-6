"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type StatusMetrics = {
  restrict: number;
  clear: number;
  review: number;
};

function IconClock({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M12 7v5l3 2" />
    </svg>
  );
}

export function StatusOverviewPanel() {
  const [metrics, setMetrics] = useState<StatusMetrics>({ restrict: 3, clear: 9814, review: 6 });

  useEffect(() => {
    const id = setInterval(() => {
      setMetrics((prev) => ({
        restrict: prev.restrict + (Math.random() > 0.82 ? 1 : 0),
        clear: prev.clear + (Math.random() > 0.42 ? 1 : 0),
        review: prev.review + (Math.random() > 0.72 ? 1 : 0),
      }));
    }, 5_000);
    return () => clearInterval(id);
  }, []);

  const total = useMemo(() => metrics.restrict + metrics.clear + metrics.review, [metrics]);

  const rows = useMemo(
    () => [
      { label: "SCREENED (L1)", value: total, valueClass: "text-neutral-900" },
      { label: "AUTO-RESTRICT (L2)", value: metrics.restrict, valueClass: "text-red-600" },
      { label: "AUTO-CLEAR (L2)", value: metrics.clear, valueClass: "text-emerald-600" },
      { label: "HUMAN REVIEW (L3)", value: metrics.review, valueClass: "text-amber-600" },
    ],
    [metrics, total]
  );

  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-[#f7f7f8] p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-600">
          Overview
        </p>
        <div className="flex shrink-0 items-center gap-1 text-[10px] text-neutral-400">
          <IconClock className="size-3.5" />
          <span>updated just now</span>
        </div>
      </div>

      <div className="mb-6 space-y-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between rounded-xl border border-neutral-200/70 bg-white px-3 py-2.5"
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
              {row.label}
            </span>
            <span className={`text-2xl font-bold tabular-nums transition-colors ${row.valueClass}`}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <Link
        href="/queue"
        className="flex w-full items-center justify-center gap-1 rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800"
      >
        Review Queue ({metrics.review})
        <span className="text-base leading-none" aria-hidden>
          ›
        </span>
      </Link>
    </div>
  );
}
