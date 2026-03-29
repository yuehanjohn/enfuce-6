import type { AuditEntry } from "@/types/screening";

export type ActivityTone = "muted" | "success" | "warning" | "danger";

export interface ActivityLine {
  id: string;
  ts: number;
  time: string;
  text: string;
  tone: ActivityTone;
  source: "audit" | "sim";
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return "--:--:--";
  }
}

function shortCustomer(id: string): string {
  if (!id || id === "BATCH") return "";
  return id.length > 8 ? `…${id.slice(-6)}` : id;
}

export function auditEntryToActivityItem(entry: AuditEntry): ActivityLine {
  const ts = new Date(entry.created_at).getTime();
  const time = formatTime(entry.created_at);
  const payload = entry.payload;
  const customer = shortCustomer(entry.customer_id);

  switch (entry.event_type) {
    case "LAYER1_SCREENING_COMPLETE": {
      const flags = Number(payload.flags_produced ?? 0);
      const customers = Number(payload.customers_screened ?? 0);
      const sanctions = Number(payload.sanctions_entries ?? 0);
      return {
        id: entry.log_id,
        ts,
        time,
        text: `Layer 1 complete — ${flags} flag(s), ${customers} customer(s), ${sanctions} watchlist row(s).`,
        tone: "muted",
        source: "audit",
      };
    }
    case "HUMAN_CLEARED":
      return {
        id: entry.log_id,
        ts,
        time,
        text: `Layer 3 human decision: CLEARED${customer ? ` — customer ${customer}` : ""}.`,
        tone: "success",
        source: "audit",
      };
    case "HUMAN_RESTRICTED":
      return {
        id: entry.log_id,
        ts,
        time,
        text: `Layer 3 human decision: RESTRICTED${customer ? ` — customer ${customer}` : ""}.`,
        tone: "danger",
        source: "audit",
      };
    default: {
      if (entry.event_type.startsWith("LAYER2_")) {
        const routing = entry.event_type.replace("LAYER2_", "");
        const confidence =
          typeof payload.ai_confidence === "number"
            ? ` confidence ${Math.round(payload.ai_confidence * 100)}%`
            : "";
        const resultId = typeof payload.result_id === "string" ? ` [${payload.result_id}]` : "";

        let tone: ActivityTone = "muted";
        let verb = routing;
        if (routing === "AUTO_CLEAR") {
          tone = "success";
          verb = "Auto-clear";
        } else if (routing === "AUTO_RESTRICT") {
          tone = "danger";
          verb = "Auto-restrict";
        } else if (routing === "HUMAN_REVIEW") {
          tone = "warning";
          verb = "Queued for human review";
        }

        return {
          id: entry.log_id,
          ts,
          time,
          text: `Layer 2 — ${verb}${resultId}${customer ? ` — ${customer}` : ""}${confidence}.`,
          tone,
          source: "audit",
        };
      }

      return {
        id: entry.log_id,
        ts,
        time,
        text: `${entry.event_type}${customer ? ` — ${customer}` : ""} (layer ${entry.layer}).`,
        tone: "muted",
        source: "audit",
      };
    }
  }
}

export function auditEntriesToActivityItems(entries: AuditEntry[]): ActivityLine[] {
  return entries.map(auditEntryToActivityItem).sort((a, b) => a.ts - b.ts);
}

const SIM_MESSAGES: { text: string; tone: ActivityTone }[] = [
  { text: "L1 Data Warehouse: Snowflake session pool warm — 10k customers cached.", tone: "muted" },
  {
    text: "L1 Data Warehouse: watchlist sync complete — OFAC, UN, EU lists current.",
    tone: "muted",
  },
  { text: "L2 AI: Cortex inference gateway latency 42ms — within SLO.", tone: "muted" },
  { text: "L2 AI: worker claiming next flagged case from queue…", tone: "muted" },
  { text: "L3 Search: Brave Search connector rate limit nominal (18/100 req/min).", tone: "muted" },
  { text: "L3 Search: background context retrieval via CORTEX.COMPLETE OK.", tone: "success" },
  { text: "Audit writer: batch flush — 12 entries persisted.", tone: "success" },
  { text: "Health check: /api/screening/health — all layers responding.", tone: "muted" },
  { text: "Database: Supabase connection pool 3/20 active — idle.", tone: "muted" },
  {
    text: "L2 AI: fast-path routing for low-score flags (<30%) — avg 0.8s per case.",
    tone: "muted",
  },
  {
    text: "L2 AI: deep-path routing for high-score flags (>70%) — avg 10s per case.",
    tone: "muted",
  },
  { text: "L1 Data Warehouse: deterministic match scan completed in 480ms.", tone: "muted" },
];

export function simulatedActivityLine(seq: number): ActivityLine {
  const row =
    SIM_MESSAGES[((seq % SIM_MESSAGES.length) + SIM_MESSAGES.length) % SIM_MESSAGES.length];
  const ts = Date.now();
  const time = new Date(ts).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return {
    id: `sim-${ts}-${seq}`,
    ts,
    time,
    text: row.text,
    tone: row.tone,
    source: "sim",
  };
}
