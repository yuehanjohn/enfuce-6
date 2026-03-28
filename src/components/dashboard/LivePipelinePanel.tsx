"use client";

import type {
  SegmentTone,
  SystemStatusResponse,
  SystemStatusSegment,
} from "@/lib/dashboard/system-status";
import { useEffect, useState } from "react";

function segmentClassName(tone: SegmentTone): string {
  switch (tone) {
    case "degraded":
      return "bg-amber-400";
    case "incident":
      return "bg-red-500";
    default:
      return "bg-emerald-400";
  }
}

function hasIssue(segment: SystemStatusSegment): boolean {
  return segment.tone !== "healthy" && Boolean(segment.event);
}

export function LivePipelinePanel() {
  const [statusData, setStatusData] = useState<SystemStatusResponse | null>(null);
  useEffect(() => {
    const controller = new AbortController();

    async function loadStatus() {
      try {
        const res = await fetch("/api/dashboard/system-status", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as SystemStatusResponse;
        setStatusData(data);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("System status fetch failed:", error);
        }
      }
    }

    void loadStatus();
    const id = setInterval(() => void loadStatus(), 20_000);

    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, []);

  const services = statusData?.services ?? [];
  return (
    <section className="mt-4 bg-transparent p-0 shadow-none">
      <div className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-600">
          System status
        </p>
        <h2 className="mt-2 text-2xl font-bold text-neutral-900">
          Service health over the last 24 hours
        </h2>
      </div>

      <div className="space-y-5">
        {services.map((service) => (
          <article
            key={service.name}
            className="border-t border-neutral-200/80 py-5 first:border-t-0 first:pt-0"
          >
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xl font-semibold text-neutral-900">{service.name}</h3>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-600">
                {service.state}
              </span>
            </div>

            <div
              className="mt-4"
              role="img"
              aria-label={`${service.name} status history for the last 24 hours`}
            >
              <div className="flex items-center gap-1.5">
                {service.segments.map((segment, segmentIndex) => (
                  <div
                    key={`${service.name}-${segmentIndex}`}
                    className="group relative flex flex-1 justify-center"
                  >
                    <span
                      className={`h-9 w-full rounded-[2px] transition-transform duration-150 ${
                        hasIssue(segment)
                          ? `cursor-pointer hover:scale-y-105 ${segmentClassName(segment.tone)}`
                          : segmentClassName(segment.tone)
                      }`}
                      aria-hidden
                    />

                    {hasIssue(segment) ? (
                      <div className="pointer-events-none invisible absolute bottom-full left-1/2 z-10 mb-3 w-48 -translate-x-1/2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-left opacity-0 shadow-lg transition-all duration-200 group-hover:visible group-hover:opacity-100">
                        <p className="text-xs font-semibold text-neutral-900">
                          {segment.event?.title}
                        </p>
                        <p className="mt-1 text-[11px] text-neutral-500">
                          {segment.event?.when} • {segment.event?.duration}
                        </p>
                        {segment.event?.detail ? (
                          <p className="mt-1.5 text-[11px] leading-4 text-neutral-600">
                            {segment.event.detail}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 text-sm text-neutral-500">
              <span>24h ago</span>
              <span className="font-semibold text-neutral-700">{service.uptime} uptime</span>
              <span>Now</span>
            </div>
          </article>
        ))}

        {services.length === 0 ? (
          <div className="border-t border-dashed border-neutral-200 px-4 py-8 text-center text-sm text-neutral-400">
            Loading backend AI status feed...
          </div>
        ) : null}
      </div>
    </section>
  );
}
