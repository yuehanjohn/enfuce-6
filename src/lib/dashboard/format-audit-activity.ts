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
  { text: "Health check: API routes responding.", tone: "muted" },
  { text: "Polling screening queue for pending cases…", tone: "muted" },
  { text: "Snowflake session pool warm — no reconnect.", tone: "muted" },
  { text: "Cortex inference gateway latency within SLO.", tone: "muted" },
  { text: "Brave Search connector: rate limit nominal.", tone: "muted" },
  { text: "Audit writer: batch flush OK.", tone: "success" },
  { text: "Watching POST /api/screening/* for new jobs…", tone: "muted" },
  { text: "Layer 2 worker idle — awaiting Layer 1 flags.", tone: "muted" },
  { text: "Encrypted credentials rotation not due — skipped.", tone: "muted" },
  { text: "Metrics: screening throughput nominal (demo mode).", tone: "muted" },
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
