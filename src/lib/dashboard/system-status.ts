export type SegmentTone = "healthy" | "degraded" | "incident";

export interface SystemStatusEvent {
  title: string;
  duration: string;
  when: string;
  detail?: string;
}

export interface SystemStatusSegment {
  tone: SegmentTone;
  event?: SystemStatusEvent;
}

export interface SystemStatusService {
  name: string;
  state: string;
  uptime: string;
  segments: SystemStatusSegment[];
}

export interface SystemStatusResponse {
  generatedAt: string;
  aiSummary: string;
  services: SystemStatusService[];
}

function buildSegments(
  overrides: Array<[index: number, tone: SegmentTone, event?: SystemStatusEvent]>
): SystemStatusSegment[] {
  const segments: SystemStatusSegment[] = Array.from({ length: 24 }, () => ({ tone: "healthy" }));
  overrides.forEach(([index, tone, event]) => {
    if (index >= 0 && index < segments.length) {
      segments[index] = { tone, event };
    }
  });
  return segments;
}

function countIncidents(services: SystemStatusService[]): { degraded: number; incidents: number } {
  return services.reduce(
    (totals, service) => {
      service.segments.forEach((segment) => {
        if (segment.tone === "degraded") totals.degraded += 1;
        if (segment.tone === "incident") totals.incidents += 1;
      });
      return totals;
    },
    { degraded: 0, incidents: 0 }
  );
}

function buildAiSummary(services: SystemStatusService[]): string {
  const totals = countIncidents(services);
  const incidentServices = services.filter((service) =>
    service.segments.some((segment) => segment.tone !== "healthy")
  );

  if (totals.incidents === 0 && totals.degraded === 0) {
    return "AI monitoring reports all core services operating normally across the full 24-hour window.";
  }

  const affectedNames = incidentServices.map((service) => service.name).join(", ");
  return `AI monitoring shows stable operations overall, with ${totals.incidents} brief incident${
    totals.incidents === 1 ? "" : "s"
  } and ${totals.degraded} degraded period${totals.degraded === 1 ? "" : "s"} affecting ${affectedNames}.`;
}

export function getMockSystemStatus(): SystemStatusResponse {
  const services: SystemStatusService[] = [
    {
      name: "Layer 1 — Data Warehouse",
      state: "Operational",
      uptime: "99.76%",
      segments: buildSegments([
        [
          3,
          "degraded",
          {
            title: "Latency spike",
            duration: "2 min",
            when: "18h ago",
            detail: "Query fan-out briefly exceeded normal thresholds.",
          },
        ],
        [
          12,
          "incident",
          {
            title: "Temporary outage",
            duration: "6 min",
            when: "9h ago",
            detail: "Data ingestion restarted after a failed worker deploy.",
          },
        ],
        [
          14,
          "degraded",
          {
            title: "Service degraded",
            duration: "4 min",
            when: "7h ago",
            detail: "Backfill jobs increased processing delay for warehouse sync.",
          },
        ],
      ]),
    },
    {
      name: "Layer 2 — AI",
      state: "Operational",
      uptime: "99.82%",
      segments: buildSegments([
        [
          12,
          "incident",
          {
            title: "Temporary outage",
            duration: "5 min",
            when: "9h ago",
            detail: "Model inference recovered automatically after regional failover.",
          },
        ],
      ]),
    },
    {
      name: "Layer 3 — Search",
      state: "Operational",
      uptime: "99.82%",
      segments: buildSegments([
        [
          12,
          "incident",
          {
            title: "Search errors",
            duration: "5 min",
            when: "9h ago",
            detail: "Search index retries spiked before the service stabilized.",
          },
        ],
      ]),
    },
    {
      name: "Database",
      state: "Operational",
      uptime: "100.00%",
      segments: buildSegments([]),
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    aiSummary: buildAiSummary(services),
    services,
  };
}
