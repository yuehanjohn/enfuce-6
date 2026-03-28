// Snowflake query layer for screening data
// Reads/writes to real Snowflake when configured; returns null to signal mock fallback.

import { executeQuery, executeStatement, isSnowflakeConfigured } from "@/lib/snowflake";
import type {
  Customer,
  SanctionsEntry,
  Layer1Flag,
  Layer2Result,
  QueueItem,
  AuditEntry,
} from "@/types/screening";

// ── Guard ───────────────────────────────────────────────────────────

export function hasSnowflakeConnection(): boolean {
  return isSnowflakeConfigured();
}

// ── Customers ───────────────────────────────────────────────────────

export async function fetchCustomers(): Promise<Customer[]> {
  const result = await executeQuery<Record<string, string>>(`
    SELECT customer_id, full_name, TO_CHAR(dob, 'YYYY-MM-DD') AS dob,
           nationality, email, entity_type, TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
    FROM CUSTOMERS.ONBOARDING
    ORDER BY created_at DESC
  `);
  return result.rows.map((r) => ({
    customer_id: r.customer_id,
    full_name: r.full_name,
    dob: r.dob ?? "",
    nationality: r.nationality ?? "",
    email: r.email ?? "",
    entity_type: (r.entity_type as Customer["entity_type"]) ?? "INDIVIDUAL",
    created_at: r.created_at ?? "",
  }));
}

export async function fetchCustomerById(id: string): Promise<Customer | null> {
  const result = await executeQuery<Record<string, string>>(`
    SELECT customer_id, full_name, TO_CHAR(dob, 'YYYY-MM-DD') AS dob,
           nationality, email, entity_type, TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
    FROM CUSTOMERS.ONBOARDING
    WHERE customer_id = '${id.replace(/'/g, "''")}'
  `);
  if (result.rows.length === 0) return null;
  const r = result.rows[0];
  return {
    customer_id: r.customer_id,
    full_name: r.full_name,
    dob: r.dob ?? "",
    nationality: r.nationality ?? "",
    email: r.email ?? "",
    entity_type: (r.entity_type as Customer["entity_type"]) ?? "INDIVIDUAL",
    created_at: r.created_at ?? "",
  };
}

// ── Watchlist ───────────────────────────────────────────────────────

export async function fetchSanctionsEntryById(id: string): Promise<SanctionsEntry | null> {
  const result = await executeQuery<Record<string, string>>(`
    SELECT entity_id, sr_no, listing_country, authority, list_name, entity_type,
           entity_name, entity_aliases, TO_CHAR(effective_date, 'YYYY-MM-DD') AS effective_date,
           TO_CHAR(expiry_date, 'YYYY-MM-DD') AS expiry_date,
           entity_notes, citation_link, address, country,
           nationality_country, citizenship_country,
           TO_CHAR(dob, 'YYYY-MM-DD') AS dob, pob,
           call_sign, vessel_type, vessel_flag, vessel_owner,
           gross_tonnage, gross_registered_tonnage
    FROM WATCHLIST.SANCTIONS_PEP
    WHERE entity_id = '${id.replace(/'/g, "''")}'
  `);
  if (result.rows.length === 0) return null;
  const r = result.rows[0];
  return {
    entity_id: r.entity_id,
    sr_no: Number(r.sr_no) || 0,
    listing_country: r.listing_country ?? "",
    authority: r.authority ?? "",
    list_name: r.list_name ?? "",
    entity_type: r.entity_type ?? "",
    entity_name: r.entity_name ?? "",
    entity_aliases: r.entity_aliases ?? "",
    effective_date: r.effective_date ?? "",
    expiry_date: r.expiry_date || null,
    entity_notes: r.entity_notes ?? "",
    citation_link: r.citation_link ?? "",
    address: r.address ?? "",
    country: r.country ?? "",
    nationality_country: r.nationality_country ?? "",
    citizenship_country: r.citizenship_country ?? "",
    dob: r.dob ?? "",
    pob: r.pob ?? "",
    call_sign: r.call_sign || null,
    vessel_type: r.vessel_type || null,
    vessel_flag: r.vessel_flag || null,
    vessel_owner: r.vessel_owner || null,
    gross_tonnage: r.gross_tonnage || null,
    gross_registered_tonnage: r.gross_registered_tonnage
      ? Number(r.gross_registered_tonnage)
      : null,
  };
}

// ── Layer 1 Flags ───────────────────────────────────────────────────

export async function fetchLayer1Flags(): Promise<Layer1Flag[]> {
  const result = await executeQuery<Record<string, string>>(`
    SELECT flag_id, customer_id, entity_id, composite_score, name_score,
           dob_score, nationality_score,
           TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
    FROM SCREENING.LAYER1_FLAGS
    ORDER BY composite_score DESC
  `);
  return result.rows.map((r) => ({
    flag_id: r.flag_id,
    customer_id: r.customer_id,
    entity_id: r.entity_id,
    composite_score: Number(r.composite_score),
    name_score: Number(r.name_score),
    dob_score: Number(r.dob_score),
    nationality_score: Number(r.nationality_score),
    created_at: r.created_at ?? "",
  }));
}

export async function fetchLayer1ByCustomer(customerId: string): Promise<Layer1Flag | null> {
  const result = await executeQuery<Record<string, string>>(`
    SELECT flag_id, customer_id, entity_id, composite_score, name_score,
           dob_score, nationality_score,
           TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
    FROM SCREENING.LAYER1_FLAGS
    WHERE customer_id = '${customerId.replace(/'/g, "''")}'
    LIMIT 1
  `);
  if (result.rows.length === 0) return null;
  const r = result.rows[0];
  return {
    flag_id: r.flag_id,
    customer_id: r.customer_id,
    entity_id: r.entity_id,
    composite_score: Number(r.composite_score),
    name_score: Number(r.name_score),
    dob_score: Number(r.dob_score),
    nationality_score: Number(r.nationality_score),
    created_at: r.created_at ?? "",
  };
}

export async function runLayer1Screening(): Promise<{ flagCount: number; customerCount: number }> {
  // Count customers first
  const countResult = await executeQuery<{ cnt: string }>(
    `SELECT COUNT(*) AS cnt FROM CUSTOMERS.ONBOARDING`
  );
  const customerCount = Number(countResult.rows[0]?.cnt ?? 0);

  // Keep Layer 1 deterministic for each run.
  await executeStatement(`TRUNCATE TABLE SCREENING.LAYER1_FLAGS`);

  // Run the screening query (same structure as seed/003_run_layer1.sql)
  await executeStatement(`
    INSERT INTO SCREENING.LAYER1_FLAGS (flag_id, customer_id, entity_id, composite_score, name_score, dob_score, nationality_score)
  WITH base AS (
        SELECT
      c.customer_id,
      c.full_name,
      c.dob AS customer_dob,
      c.nationality,
      w.entity_id,
      w.entity_name,
      w.entity_aliases,
      w.dob AS watchlist_dob,
      w.nationality_country,
      w.citizenship_country,
      SCREENING.JARO_WINKLER_SIMILARITY(c.full_name, w.entity_name) AS name_sim
    FROM CUSTOMERS.ONBOARDING c
    CROSS JOIN WATCHLIST.SANCTIONS_PEP w
  ),
  alias_scores AS (
    SELECT
      b.customer_id,
      b.entity_id,
      MAX(
        SCREENING.JARO_WINKLER_SIMILARITY(
          b.full_name,
          TRIM(a.VALUE)
        )
      ) AS best_alias_sim
    FROM base b,
       LATERAL SPLIT_TO_TABLE(b.entity_aliases, ';') a
    GROUP BY b.customer_id, b.entity_id
  ),
  scored AS (
    SELECT
      b.customer_id,
      b.entity_id,
      b.name_sim,
      CASE WHEN b.name_sim >= 0.92 THEN 70
           WHEN b.name_sim >= 0.82 THEN 50
           ELSE 0 END AS name_points,
      CASE WHEN COALESCE(a.best_alias_sim, 0) >= 0.82 THEN 25 ELSE 0 END AS alias_points,
      CASE WHEN b.customer_dob IS NULL OR b.watchlist_dob IS NULL THEN 0
         WHEN b.customer_dob = b.watchlist_dob THEN 30
         WHEN ABS(DATEDIFF('year', b.customer_dob, b.watchlist_dob)) <= 1 THEN 15
                 ELSE 0 END AS dob_points,
      CASE WHEN b.nationality IS NULL OR COALESCE(b.nationality_country, b.citizenship_country) IS NULL THEN 0
         WHEN UPPER(b.nationality) = UPPER(COALESCE(b.nationality_country, b.citizenship_country)) THEN 20
                 ELSE -10 END AS nat_points
    FROM base b
    LEFT JOIN alias_scores a
      ON b.customer_id = a.customer_id
     AND b.entity_id = a.entity_id
    )
    SELECT 'FLAG-' || customer_id || '-' || entity_id, customer_id, entity_id,
           name_points + alias_points + dob_points + nat_points, name_sim, dob_points, nat_points
    FROM scored
    WHERE name_points + alias_points + dob_points + nat_points >= 50
  `);

  const flagResult = await executeQuery<{ cnt: string }>(
    `SELECT COUNT(*) AS cnt FROM SCREENING.LAYER1_FLAGS`
  );
  const flagCount = Number(flagResult.rows[0]?.cnt ?? 0);

  return { flagCount, customerCount };
}

// ── Layer 2 Results ─────────────────────────────────────────────────

export async function fetchLayer2Results(): Promise<Layer2Result[]> {
  const result = await executeQuery<Record<string, unknown>>(`
    SELECT result_id, flag_id, customer_id, entity_id, ai_confidence, routing,
           reasoning, matching_signals, conflicting_signals, sources,
           TO_CHAR(processed_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS processed_at
    FROM SCREENING.LAYER2_RESULTS
    ORDER BY ai_confidence DESC
  `);
  return result.rows.map((r) => ({
    result_id: String(r.result_id),
    flag_id: String(r.flag_id),
    customer_id: String(r.customer_id),
    entity_id: String(r.entity_id),
    ai_confidence: Number(r.ai_confidence),
    routing: String(r.routing) as Layer2Result["routing"],
    reasoning: String(r.reasoning ?? ""),
    matching_signals: (r.matching_signals as string[]) ?? [],
    conflicting_signals: (r.conflicting_signals as string[]) ?? [],
    sources: (r.sources as Layer2Result["sources"]) ?? [],
    processed_at: String(r.processed_at ?? ""),
  }));
}

export async function fetchLayer2ByResultId(id: string): Promise<Layer2Result | null> {
  const result = await executeQuery<Record<string, unknown>>(`
    SELECT result_id, flag_id, customer_id, entity_id, ai_confidence, routing,
           reasoning, matching_signals, conflicting_signals, sources,
           TO_CHAR(processed_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS processed_at
    FROM SCREENING.LAYER2_RESULTS
    WHERE result_id = '${id.replace(/'/g, "''")}'
  `);
  if (result.rows.length === 0) return null;
  const r = result.rows[0];
  return {
    result_id: String(r.result_id),
    flag_id: String(r.flag_id),
    customer_id: String(r.customer_id),
    entity_id: String(r.entity_id),
    ai_confidence: Number(r.ai_confidence),
    routing: String(r.routing) as Layer2Result["routing"],
    reasoning: String(r.reasoning ?? ""),
    matching_signals: (r.matching_signals as string[]) ?? [],
    conflicting_signals: (r.conflicting_signals as string[]) ?? [],
    sources: (r.sources as Layer2Result["sources"]) ?? [],
    processed_at: String(r.processed_at ?? ""),
  };
}

export async function runLayer2Processing(): Promise<{
  total: number;
  auto_restrict: number;
  auto_clear: number;
  human_review: number;
}> {
  // Call the stored procedure
  await executeStatement(`CALL SCREENING.PROCESS_LAYER2_BATCH()`);

  const result = await executeQuery<Record<string, string>>(`
    SELECT routing, COUNT(*) AS cnt FROM SCREENING.LAYER2_RESULTS GROUP BY routing
  `);

  const summary = { total: 0, auto_restrict: 0, auto_clear: 0, human_review: 0 };
  for (const row of result.rows) {
    const count = Number(row.cnt);
    summary.total += count;
    if (row.routing === "AUTO_RESTRICT") summary.auto_restrict = count;
    else if (row.routing === "AUTO_CLEAR") summary.auto_clear = count;
    else if (row.routing === "HUMAN_REVIEW") summary.human_review = count;
  }
  return summary;
}

// ── Queue ───────────────────────────────────────────────────────────

export async function fetchQueue(
  limit = 25
): Promise<
  (QueueItem & {
    customer_name: string;
    customer_nationality: string;
    customer_dob: string;
    entity_name: string;
    list_source: string;
    reasoning_summary: string;
  })[]
> {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(100, Math.floor(limit))) : 25;
  const result = await executeQuery<Record<string, string>>(`
    SELECT q.queue_id, q.result_id, q.customer_id, q.entity_id, q.ai_confidence,
           q.assigned_to, TO_CHAR(q.queued_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS queued_at,
           q.status,
           c.full_name AS customer_name, c.nationality AS customer_nationality,
           TO_CHAR(c.dob, 'YYYY-MM-DD') AS customer_dob,
           w.entity_name, w.authority || ' - ' || w.list_name AS list_source,
           '' AS reasoning_summary
    FROM QUEUE.PENDING_REVIEW q
    JOIN CUSTOMERS.ONBOARDING c ON c.customer_id = q.customer_id
    JOIN WATCHLIST.SANCTIONS_PEP w ON w.entity_id = q.entity_id
    WHERE q.status != 'DECIDED'
    ORDER BY q.queued_at DESC
    LIMIT ${safeLimit}
  `);
  return result.rows.map((r) => ({
    queue_id: r.queue_id,
    result_id: r.result_id,
    customer_id: r.customer_id,
    entity_id: r.entity_id,
    ai_confidence: Number(r.ai_confidence),
    assigned_to: r.assigned_to || null,
    queued_at: r.queued_at ?? "",
    status: (r.status as QueueItem["status"]) ?? "PENDING",
    customer_name: r.customer_name ?? "",
    customer_nationality: r.customer_nationality ?? "",
    customer_dob: r.customer_dob ?? "",
    entity_name: r.entity_name ?? "",
    list_source: r.list_source ?? "",
    reasoning_summary: r.reasoning_summary ?? "",
  }));
}

export async function fetchQueueItemById(id: string): Promise<QueueItem | null> {
  const result = await executeQuery<Record<string, string>>(`
    SELECT queue_id, result_id, customer_id, entity_id, ai_confidence,
           assigned_to, TO_CHAR(queued_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS queued_at, status
    FROM QUEUE.PENDING_REVIEW
    WHERE queue_id = '${id.replace(/'/g, "''")}'
  `);
  if (result.rows.length === 0) return null;
  const r = result.rows[0];
  return {
    queue_id: r.queue_id,
    result_id: r.result_id,
    customer_id: r.customer_id,
    entity_id: r.entity_id,
    ai_confidence: Number(r.ai_confidence),
    assigned_to: r.assigned_to || null,
    queued_at: r.queued_at ?? "",
    status: (r.status as QueueItem["status"]) ?? "PENDING",
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
  const table = params.decision === "APPROVE" ? "DECISIONS.CLEARANCES" : "DECISIONS.RESTRICTIONS";
  const esc = (s: string) => s.replace(/'/g, "''");

  // Insert decision
  await executeStatement(`
    INSERT INTO ${table} (decision_id, customer_id, result_id, trigger_type, analyst_id, reason_category, analyst_note)
    VALUES ('${decisionId}', '${esc(params.customerId)}', '${esc(params.resultId)}', 'HUMAN', 'analyst-demo', '${esc(params.reasonCategory)}', '${esc(params.analystNote)}')
  `);

  // Update queue status
  await executeStatement(`
    UPDATE QUEUE.PENDING_REVIEW SET status = 'DECIDED' WHERE queue_id = '${esc(params.queueId)}'
  `);

  // Audit log
  const eventType = params.decision === "APPROVE" ? "HUMAN_CLEARED" : "HUMAN_RESTRICTED";
  const payload = JSON.stringify({
    decision_id: decisionId,
    decision: params.decision,
    reason_category: params.reasonCategory,
    analyst_note: params.analystNote,
  }).replace(/'/g, "''");

  await executeStatement(`
    INSERT INTO AUDIT.LOG (log_id, customer_id, layer, event_type, payload, analyst_id, ai_chat_transcript)
    VALUES ('AUDIT-L3-${Date.now()}', '${esc(params.customerId)}', 3, '${eventType}', PARSE_JSON('${payload}'), 'analyst-demo', ${params.chatTranscript ? "'" + esc(params.chatTranscript) + "'" : "NULL"})
  `);
}

// ── Audit Log ───────────────────────────────────────────────────────

export async function fetchAuditLog(): Promise<AuditEntry[]> {
  const result = await executeQuery<Record<string, unknown>>(`
    SELECT log_id, customer_id, layer, event_type, payload, analyst_id,
           ai_chat_transcript,
           TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
    FROM AUDIT.LOG
    ORDER BY created_at DESC
    LIMIT 200
  `);
  return result.rows.map((r) => ({
    log_id: String(r.log_id),
    customer_id: String(r.customer_id),
    layer: Number(r.layer) as AuditEntry["layer"],
    event_type: String(r.event_type),
    payload: (typeof r.payload === "object" ? r.payload : {}) as Record<string, unknown>,
    analyst_id: r.analyst_id ? String(r.analyst_id) : null,
    ai_chat_transcript: r.ai_chat_transcript ? String(r.ai_chat_transcript) : null,
    created_at: String(r.created_at ?? ""),
  }));
}
