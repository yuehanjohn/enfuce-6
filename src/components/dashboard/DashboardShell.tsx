"use client";

import { BackendActivityLogPanel } from "@/components/dashboard/BackendActivityLogPanel";
import { LivePipelinePanel } from "@/components/dashboard/LivePipelinePanel";
import { StatusOverviewPanel } from "@/components/dashboard/StatusOverviewPanel";
import { useActivation } from "@/contexts/activation-context";
import { useState } from "react";

const recentActivity = [
  {
    name: "Viktor Petrov",
    status: "Auto-Restrict",
    score: "94%",
    time: "10:31 AM",
    detail: "Exact match on OFAC SDN list. AI confirmed — name, DOB, nationality all match.",
  },
  {
    name: "Ahmad Al-Hassan",
    status: "Human Review",
    score: "58%",
    time: "10:18 AM",
    detail: "Flagged against UN sanctions. AI inconclusive — name match but DOB off by 2 years.",
  },
  {
    name: "John Smith",
    status: "Auto-Cleared",
    score: "12%",
    time: "10:14 AM",
    detail: "Fuzzy match on common name. AI cleared — no supporting signals from Brave Search.",
  },
  {
    name: "Fatima Nour",
    status: "Human Review",
    score: "44%",
    time: "09:52 AM",
    detail: "Partial name match on EU sanctions list. AI queued for review — insufficient data.",
  },
  {
    name: "Li Wei",
    status: "Auto-Cleared",
    score: "8%",
    time: "09:40 AM",
    detail: "Phonetic match only. AI cleared — high-frequency name, zero corroborating evidence.",
  },
];

function IconDatabase({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v6c0 1.66 3.13 3 7 3s7-1.34 7-3V6" />
      <path d="M5 12v6c0 1.66 3.13 3 7 3s7-1.34 7-3v-6" />
    </svg>
  );
}

function IconPower({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
      <line x1="12" y1="2" x2="12" y2="12" />
    </svg>
  );
}

export function DashboardShell() {
  const [backendLogHidden, setBackendLogHidden] = useState(false);
  const { stage } = useActivation();

  if (stage === "idle") {
    return (
      <div className="-m-6 flex h-[calc(100%+3rem)] items-center justify-center bg-[#f9fafb]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
            <IconPower className="size-8" />
          </div>
          <p className="text-lg font-semibold text-neutral-800">Screening pipeline inactive</p>
          <p className="max-w-sm text-sm text-neutral-500">
            Click the <span className="font-medium text-neutral-700">Activate</span> button in the
            sidebar to start the sanctions screening pipeline. Logs, uptime, and metrics will appear
            here once the system is running.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="-m-6 h-[calc(100%+3rem)] overflow-hidden bg-[#f9fafb] p-6">
      {backendLogHidden ? (
        <div className="pointer-events-none absolute right-6 top-6 z-20">
          <button
            type="button"
            onClick={() => setBackendLogHidden(false)}
            aria-label="Show backend activity log"
            className="pointer-events-auto relative inline-flex size-10 items-center justify-center rounded-xl border border-neutral-200/80 bg-white text-blue-600 shadow-sm transition-colors hover:bg-neutral-50"
          >
            <span
              className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-emerald-500"
              aria-hidden
            />
            <IconDatabase className="size-5" />
          </button>
        </div>
      ) : null}

      <div className="grid h-full min-h-0 gap-6 xl:grid-cols-[minmax(20rem,1fr)_minmax(28rem,1.2fr)_minmax(22rem,1fr)] xl:items-stretch">
        <div className="hide-scrollbar flex h-full min-w-0 min-h-0 flex-col gap-6 overflow-y-auto overflow-x-hidden overscroll-contain pe-2">
          <StatusOverviewPanel />

          <section className="bg-transparent p-0 shadow-none">
            <h2 className="mb-4 text-sm font-semibold text-neutral-700">Recent activity</h2>
            <div className="space-y-4">
              {recentActivity.map((row) => (
                <div key={row.name + row.time} className="text-xs leading-relaxed">
                  <div className="mb-0.5 flex items-center justify-between gap-2">
                    <p className="font-semibold text-neutral-800">
                      {row.name}{" "}
                      <span
                        className={
                          row.status === "Auto-Cleared"
                            ? "text-emerald-600"
                            : row.status === "Auto-Restrict"
                              ? "text-red-600"
                              : "text-amber-600"
                        }
                      >
                        - {row.status} ({row.score})
                      </span>
                    </p>
                    <time className="shrink-0 text-xs text-neutral-400">{row.time}</time>
                  </div>
                  <p className="text-neutral-500">
                    <span className="me-1 text-neutral-300">{"->"}</span>
                    {row.detail}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div
          className={`flex h-full min-w-0 min-h-0 flex-col gap-6 overflow-hidden ${
            backendLogHidden ? "xl:col-start-2 xl:col-end-4" : ""
          }`}
        >
          <LivePipelinePanel />
        </div>

        {!backendLogHidden ? (
          <div className="flex h-full min-w-0 min-h-0 flex-col gap-6 overflow-hidden">
            <BackendActivityLogPanel onHide={() => setBackendLogHidden(true)} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
