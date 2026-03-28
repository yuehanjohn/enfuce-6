"use client";

import {
  auditEntriesToActivityItems,
  simulatedActivityLine,
  type ActivityLine,
  type ActivityTone,
} from "@/lib/dashboard/format-audit-activity";
import type { AuditEntry } from "@/types/screening";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

const POLL_MS = 1200;
const SIM_MS = 1400;
const MAX_AUDIT_LINES = 75;
const MAX_SIM_LINES = 28;
const MAX_MERGED = 95;

function toneClasses(tone: ActivityTone): { row: string; body: string } {
  switch (tone) {
    case "success":
      return { row: "font-medium text-emerald-600", body: "text-emerald-600" };
    case "warning":
      return { row: "font-medium text-amber-600", body: "text-amber-600" };
    case "danger":
      return { row: "font-medium text-red-600", body: "text-red-600" };
    default:
      return { row: "text-neutral-500", body: "text-neutral-600" };
  }
}

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

function IconX({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function BackendActivityLogPanel({ onHide }: { onHide: () => void }) {
  const [auditLines, setAuditLines] = useState<ActivityLine[]>([]);
  const [simLines, setSimLines] = useState<ActivityLine[]>([]);
  const [pollError, setPollError] = useState(false);
  const simSeqRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  const mergedLines = useMemo(() => {
    const tailAudit = auditLines.slice(-MAX_AUDIT_LINES);
    const tailSim = simLines.slice(-MAX_SIM_LINES);
    return [...tailAudit, ...tailSim].sort((a, b) => a.ts - b.ts).slice(-MAX_MERGED);
  }, [auditLines, simLines]);

  useEffect(() => {
    const ac = new AbortController();

    async function pull() {
      try {
        const res = await fetch("/api/screening/audit", { signal: ac.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { entries: AuditEntry[] };
        const mapped = auditEntriesToActivityItems(data.entries ?? []);
        setAuditLines(mapped.slice(-MAX_AUDIT_LINES));
        setPollError(false);
      } catch {
        if (!ac.signal.aborted) setPollError(true);
      }
    }

    void pull();
    const id = setInterval(() => void pull(), POLL_MS);
    return () => {
      ac.abort();
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    setSimLines([simulatedActivityLine(simSeqRef.current)]);
    simSeqRef.current += 1;
    const id = setInterval(() => {
      const line = simulatedActivityLine(simSeqRef.current);
      simSeqRef.current += 1;
      setSimLines((prev) => [...prev.slice(-(MAX_SIM_LINES - 1)), line]);
    }, SIM_MS);
    return () => clearInterval(id);
  }, []);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (!stickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [mergedLines]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 32;
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col border-l border-neutral-300/80 pl-5 shadow-none">
      <div className="flex items-center pe-1">
        <div
          id="backend-activity-log-header"
          className="flex min-w-0 flex-1 items-center gap-2 py-1"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="size-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
            <IconDatabase className="size-5 shrink-0 text-blue-600" />
            <span className="text-xs font-bold tracking-wide text-neutral-500">
              BACKEND ACTIVITY LOG
            </span>
            {pollError ? (
              <span className="truncate text-[10px] font-normal normal-case text-amber-600">
                Live audit unavailable
              </span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onHide}
          aria-label="Hide backend activity panel"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
        >
          <IconX className="size-3.5" />
        </button>
      </div>
      <div className="relative mt-4 min-h-0 flex-1">
        <div
          ref={scrollRef}
          id="backend-activity-log-body"
          role="log"
          aria-live="off"
          aria-labelledby="backend-activity-log-header"
          onScroll={handleScroll}
          className="hide-scrollbar h-full min-h-0 space-y-3 overflow-y-auto overflow-x-hidden overscroll-contain pr-2 font-mono text-xs leading-relaxed"
        >
          {mergedLines.length === 0 ? (
            <p className="text-neutral-400">
              Waiting for audit entries... simulated stream running.
            </p>
          ) : (
            mergedLines.map((line) => {
              const { row, body } = toneClasses(line.tone);
              return (
                <p key={line.id} className={row}>
                  <span className="text-neutral-400">{line.time}</span>{" "}
                  <span className={body}>{line.text}</span>
                </p>
              );
            })
          )}
        </div>
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-[#f9fafb] to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#f9fafb] to-transparent"
          aria-hidden
        />
      </div>
    </section>
  );
}
