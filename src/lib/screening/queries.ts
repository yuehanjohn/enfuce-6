// Supabase query layer for screening data
// Reads/writes to Supabase when configured; returns null to signal mock fallback.

import { isSupabaseConfigured, getServiceClient } from "@/lib/supabase/server";
import type {
  Customer,
  SanctionsEntry,
  Layer1Flag,
  Layer2Result,
  QueueItem,
  AuditEntry,
} from "@/types/screening";

// Use Record<string, unknown> as the row type since we don't have generated Supabase types
type Row = Record<string, unknown>;

// ── Guard ───────────────────────────────────────────────────────────

export function isScreeningConfigured(): boolean {
  return isSupabaseConfigured();
}

// ── Helpers ─────────────────────────────────────────────────────────

function str(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

function formatDate(d: unknown): string {
  if (!d) return "";
  return String(d).slice(0, 10); // YYYY-MM-DD from ISO
}

function formatTimestamp(d: unknown): string {
  if (!d) return "";
  const s = String(d);
  if (s.endsWith("Z") || s.includes("+")) return s;
  return `${s}Z`;
}

// Helper to run a typed select query
async function query(
  table: string,
  opts?: {
    select?: string;
    eq?: [string, string];
    neq?: [string, string];
    order?: [string, boolean];
    limit?: number;
  }
): Promise<Row[]> {
  const db = getServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (db as any).from(table).select(opts?.select ?? "*");
  if (opts?.eq) q = q.eq(opts.eq[0], opts.eq[1]);
  if (opts?.neq) q = q.neq(opts.neq[0], opts.neq[1]);
  if (opts?.order) q = q.order(opts.order[0], { ascending: opts.order[1] });
  if (opts?.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw new Error(`Supabase query on ${table} failed: ${error.message}`);
  return (data ?? []) as Row[];
}

async function queryOne(table: string, column: string, value: string): Promise<Row | null> {
  const db = getServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any).from(table).select("*").eq(column, value).single();
  if (error || !data) return null;
  return data as Row;
}

async function insert(table: string, rows: Row | Row[]): Promise<void> {
  const db = getServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from(table).insert(rows);
  if (error) throw new Error(`Supabase insert on ${table} failed: ${error.message}`);
}

async function upsert(table: string, rows: Row | Row[], onConflict: string): Promise<void> {
  const db = getServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from(table).upsert(rows, { onConflict });
  if (error) throw new Error(`Supabase upsert on ${table} failed: ${error.message}`);
}

async function update(table: string, values: Row, column: string, value: string): Promise<void> {
  const db = getServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).from(table).update(values).eq(column, value);
  if (error) throw new Error(`Supabase update on ${table} failed: ${error.message}`);
}

// ── Customers ───────────────────────────────────────────────────────

export async function fetchCustomers(): Promise<Customer[]> {
  const rows = await query("screening_customers", { order: ["created_at", false] });
  return rows.map(mapCustomer);
}

export async function fetchCustomerById(id: string): Promise<Customer | null> {
  const row = await queryOne("screening_customers", "customer_id", id);
  if (!row) return null;
  return mapCustomer(row);
}

function mapCustomer(r: Row): Customer {
  return {
    customer_id: str(r.customer_id),
    full_name: str(r.full_name),
    dob: formatDate(r.dob),
    nationality: str(r.nationality),
    email: str(r.email),
    entity_type: (str(r.entity_type) as Customer["entity_type"]) || "INDIVIDUAL",
    created_at: formatTimestamp(r.created_at),
  };
}

// ── Watchlist ───────────────────────────────────────────────────────

export async function fetchSanctionsEntries(): Promise<SanctionsEntry[]> {
  const rows = await query("screening_watchlist");
  return rows.map(mapSanctionsEntry);
}

export async function fetchSanctionsEntryById(id: string): Promise<SanctionsEntry | null> {
  const row = await queryOne("screening_watchlist", "entity_id", id);
  if (!row) return null;
  return mapSanctionsEntry(row);
}

function mapSanctionsEntry(r: Row): SanctionsEntry {
  return {
    entity_id: str(r.entity_id),
    sr_no: Number(r.sr_no) || 0,
    listing_country: str(r.listing_country),
    authority: str(r.authority),
    list_name: str(r.list_name),
    entity_type: str(r.entity_type),
    entity_name: str(r.entity_name),
    entity_aliases: str(r.entity_aliases),
    effective_date: formatDate(r.effective_date),
    expiry_date: r.expiry_date ? formatDate(r.expiry_date) : null,
    entity_notes: str(r.entity_notes),
    citation_link: str(r.citation_link),
    address: str(r.address),
    country: str(r.country),
    nationality_country: str(r.nationality_country),
    citizenship_country: str(r.citizenship_country),
    dob: formatDate(r.dob),
    pob: str(r.pob),
    call_sign: r.call_sign ? str(r.call_sign) : null,
    vessel_type: r.vessel_type ? str(r.vessel_type) : null,
    vessel_flag: r.vessel_flag ? str(r.vessel_flag) : null,
    vessel_owner: r.vessel_owner ? str(r.vessel_owner) : null,
    gross_tonnage: r.gross_tonnage ? str(r.gross_tonnage) : null,
    gross_registered_tonnage: r.gross_registered_tonnage
      ? Number(r.gross_registered_tonnage)
      : null,
  };
}

// ── Layer 1 Flags ───────────────────────────────────────────────────

export async function fetchLayer1Flags(): Promise<Layer1Flag[]> {
  const rows = await query("screening_layer1_flags", { order: ["composite_score", false] });
  return rows.map(mapLayer1Flag);
}

export async function fetchLayer1ByCustomer(customerId: string): Promise<Layer1Flag | null> {
  const rows = await query("screening_layer1_flags", { eq: ["customer_id", customerId], limit: 1 });
  if (rows.length === 0) return null;
  return mapLayer1Flag(rows[0]);
}

function mapLayer1Flag(r: Row): Layer1Flag {
  return {
    flag_id: str(r.flag_id),
    customer_id: str(r.customer_id),
    entity_id: str(r.entity_id),
    composite_score: Number(r.composite_score),
    name_score: Number(r.name_score),
    dob_score: Number(r.dob_score),
    nationality_score: Number(r.nationality_score),
    created_at: formatTimestamp(r.created_at),
  };
}

export async function insertLayer1Flags(flags: Layer1Flag[]): Promise<void> {
  if (flags.length === 0) return;

  const rows = flags.map((f) => ({
    flag_id: f.flag_id,
    customer_id: f.customer_id,
    entity_id: f.entity_id,
    composite_score: f.composite_score,
    name_score: f.name_score,
    dob_score: f.dob_score,
    nationality_score: f.nationality_score,
    created_at: f.created_at || new Date().toISOString(),
  }));

  await upsert("screening_layer1_flags", rows, "flag_id");
}

// ── Layer 1 Screening (run in TypeScript, store results in Supabase) ──

export async function runLayer1Screening(): Promise<{ flagCount: number; customerCount: number }> {
  const [customers, sanctions] = await Promise.all([fetchCustomers(), fetchSanctionsEntries()]);

  const { runLayer1Screening: runL1 } = await import("./layer1");
  const flags = runL1(customers, sanctions);

  await insertLayer1Flags(flags);

  return { flagCount: flags.length, customerCount: customers.length };
}

// ── Layer 2 Results ─────────────────────────────────────────────────

export async function fetchLayer2Results(): Promise<Layer2Result[]> {
  const rows = await query("screening_layer2_results", { order: ["ai_confidence", false] });
  return rows.map(mapLayer2Result);
}

export async function fetchLayer2ByResultId(id: string): Promise<Layer2Result | null> {
  const row = await queryOne("screening_layer2_results", "result_id", id);
  if (!row) return null;
  return mapLayer2Result(row);
}

function mapLayer2Result(r: Row): Layer2Result {
  return {
    result_id: str(r.result_id),
    flag_id: str(r.flag_id),
    customer_id: str(r.customer_id),
    entity_id: str(r.entity_id),
    ai_confidence: Number(r.ai_confidence),
    routing: str(r.routing) as Layer2Result["routing"],
    reasoning: str(r.reasoning),
    matching_signals: (r.matching_signals as string[]) ?? [],
    conflicting_signals: (r.conflicting_signals as string[]) ?? [],
    sources: (r.sources as Layer2Result["sources"]) ?? [],
    processed_at: formatTimestamp(r.processed_at),
  };
}

export async function insertLayer2Results(results: Layer2Result[]): Promise<void> {
  if (results.length === 0) return;

  const rows = results.map((r) => ({
    result_id: r.result_id,
    flag_id: r.flag_id,
    customer_id: r.customer_id,
    entity_id: r.entity_id,
    ai_confidence: r.ai_confidence,
    routing: r.routing,
    reasoning: r.reasoning,
    matching_signals: r.matching_signals,
    conflicting_signals: r.conflicting_signals,
    sources: r.sources,
    processed_at: r.processed_at || new Date().toISOString(),
  }));

  await upsert("screening_layer2_results", rows, "result_id");
}

export async function runLayer2Processing(): Promise<{
  total: number;
  auto_restrict: number;
  auto_clear: number;
  human_review: number;
}> {
  const flags = await fetchLayer1Flags();
  const [customers, sanctions] = await Promise.all([fetchCustomers(), fetchSanctionsEntries()]);

  const { processBatch } = await import("./layer2");

  const inputs = flags
    .map((flag) => ({
      customer: customers.find((c) => c.customer_id === flag.customer_id)!,
      sanctions: sanctions.find((s) => s.entity_id === flag.entity_id)!,
      flag,
    }))
    .filter((input) => input.customer && input.sanctions);

  const results = await processBatch(inputs);

  await insertLayer2Results(results);

  // Insert queue items for HUMAN_REVIEW cases
  const queueRows = results
    .filter((r) => r.routing === "HUMAN_REVIEW")
    .map((r) => ({
      queue_id: `Q-${r.result_id.replace("L2-", "")}`,
      result_id: r.result_id,
      customer_id: r.customer_id,
      entity_id: r.entity_id,
      ai_confidence: r.ai_confidence,
      status: "PENDING",
    }));

  if (queueRows.length > 0) {
    await upsert("screening_queue", queueRows, "queue_id");
  }

  const summary = { total: results.length, auto_restrict: 0, auto_clear: 0, human_review: 0 };
  for (const r of results) {
    if (r.routing === "AUTO_RESTRICT") summary.auto_restrict++;
    else if (r.routing === "AUTO_CLEAR") summary.auto_clear++;
    else if (r.routing === "HUMAN_REVIEW") summary.human_review++;
  }

  return summary;
}

// ── Queue ───────────────────────────────────────────────────────────

export async function fetchQueue(): Promise<
  (QueueItem & {
    customer_name: string;
    customer_nationality: string;
    customer_dob: string;
    entity_name: string;
    list_source: string;
    reasoning_summary: string;
  })[]
> {
  const rows = await query("screening_queue", {
    select:
      "*, screening_customers!inner(full_name, nationality, dob), screening_watchlist!inner(entity_name, authority, list_name), screening_layer2_results!inner(reasoning)",
    neq: ["status", "DECIDED"],
    order: ["ai_confidence", false],
  });

  return rows.map((r) => {
    const customer = r.screening_customers as Row;
    const watchlist = r.screening_watchlist as Row;
    const layer2 = r.screening_layer2_results as Row;

    return {
      queue_id: str(r.queue_id),
      result_id: str(r.result_id),
      customer_id: str(r.customer_id),
      entity_id: str(r.entity_id),
      ai_confidence: Number(r.ai_confidence),
      assigned_to: r.assigned_to ? str(r.assigned_to) : null,
      queued_at: formatTimestamp(r.queued_at),
      status: str(r.status) as QueueItem["status"],
      customer_name: str(customer?.full_name),
      customer_nationality: str(customer?.nationality),
      customer_dob: formatDate(customer?.dob),
      entity_name: str(watchlist?.entity_name),
      list_source: watchlist ? `${str(watchlist.authority)} - ${str(watchlist.list_name)}` : "",
      reasoning_summary: str(layer2?.reasoning).slice(0, 150),
    };
  });
}

export async function fetchQueueItemById(id: string): Promise<QueueItem | null> {
  const row = await queryOne("screening_queue", "queue_id", id);
  if (!row) return null;
  return {
    queue_id: str(row.queue_id),
    result_id: str(row.result_id),
    customer_id: str(row.customer_id),
    entity_id: str(row.entity_id),
    ai_confidence: Number(row.ai_confidence),
    assigned_to: row.assigned_to ? str(row.assigned_to) : null,
    queued_at: formatTimestamp(row.queued_at),
    status: str(row.status) as QueueItem["status"],
  };
}

// ── Decisions ───────────────────────────────────────────────────────

export async function submitDecision(params: {
  queueId: string;
  customerId: string;
  resultId: string;
  decision: "APPROVE" | "REJECT";
  reasonCategory: string;
  analystNote: string;
  chatTranscript?: string;
}): Promise<void> {
  const decisionId = `DEC-${Date.now()}`;

  await insert("screening_decisions", {
    decision_id: decisionId,
    customer_id: params.customerId,
    result_id: params.resultId,
    decision: params.decision,
    trigger_type: "HUMAN",
    analyst_id: "analyst-demo",
    reason_category: params.reasonCategory,
    analyst_note: params.analystNote,
  });

  await update("screening_queue", { status: "DECIDED" }, "queue_id", params.queueId);

  const eventType = params.decision === "APPROVE" ? "HUMAN_CLEARED" : "HUMAN_RESTRICTED";
  await insert("screening_audit_log", {
    log_id: `AUDIT-L3-${Date.now()}`,
    customer_id: params.customerId,
    layer: 3,
    event_type: eventType,
    payload: {
      decision_id: decisionId,
      decision: params.decision,
      reason_category: params.reasonCategory,
      analyst_note: params.analystNote,
    },
    analyst_id: "analyst-demo",
    ai_chat_transcript: params.chatTranscript ?? null,
  });
}

// ── Audit Log ───────────────────────────────────────────────────────

export async function fetchAuditLog(): Promise<AuditEntry[]> {
  const rows = await query("screening_audit_log", { order: ["created_at", false], limit: 200 });

  return rows.map((r) => ({
    log_id: str(r.log_id),
    customer_id: str(r.customer_id),
    layer: Number(r.layer) as AuditEntry["layer"],
    event_type: str(r.event_type),
    payload: (r.payload as Record<string, unknown>) ?? {},
    analyst_id: r.analyst_id ? str(r.analyst_id) : null,
    ai_chat_transcript: r.ai_chat_transcript ? str(r.ai_chat_transcript) : null,
    created_at: formatTimestamp(r.created_at),
  }));
}
