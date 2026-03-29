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

let layer2CombinedScoreColumnCache: boolean | null = null;

async function hasLayer2CombinedScoreColumn(): Promise<boolean> {
  if (layer2CombinedScoreColumnCache !== null) {
    return layer2CombinedScoreColumnCache;
  }

  try {
    const result = await executeQuery<{ cnt: string }>(`
      SELECT COUNT(*) AS cnt
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'SCREENING'
        AND TABLE_NAME = 'LAYER2_RESULTS'
        AND COLUMN_NAME = 'COMBINED_SCORE'
    `);
    layer2CombinedScoreColumnCache = Number(result.rows[0]?.cnt ?? 0) > 0;
  } catch {
    layer2CombinedScoreColumnCache = false;
  }

  return layer2CombinedScoreColumnCache;
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
  WITH customers_norm AS (
    SELECT
      c.customer_id,
      c.full_name,
      c.dob AS customer_dob,
      c.nationality,
      UPPER(REGEXP_REPLACE(TRIM(c.full_name), '[^A-Z0-9 ]', '')) AS customer_name_norm,
      UPPER(SPLIT_PART(TRIM(c.full_name), ' ', -1)) AS customer_last_name,
      YEAR(c.dob) AS customer_dob_year
    FROM CUSTOMERS.ONBOARDING c
  ),
  watchlist_norm AS (
    SELECT
      w.entity_id,
      w.entity_name,
      w.entity_aliases,
      w.dob AS watchlist_dob,
      w.nationality_country,
      w.citizenship_country,
      UPPER(REGEXP_REPLACE(TRIM(w.entity_name), '[^A-Z0-9 ]', '')) AS entity_name_norm,
      UPPER(SPLIT_PART(TRIM(w.entity_name), ' ', -1)) AS entity_last_name,
      YEAR(w.dob) AS watchlist_dob_year
    FROM WATCHLIST.SANCTIONS_PEP w
  ),
  candidate_pairs AS (
    SELECT
      c.customer_id,
      c.full_name,
      c.customer_dob,
      c.nationality,
      w.entity_id,
      w.entity_name,
      w.entity_aliases,
      w.watchlist_dob,
      w.nationality_country,
      w.citizenship_country
    FROM customers_norm c
    JOIN watchlist_norm w
      ON (
        -- Fast block #1: same first character after normalization.
        LEFT(c.customer_name_norm, 1) = LEFT(w.entity_name_norm, 1)
        -- Fast block #2: similar DOB year when both dates exist.
        AND (
          c.customer_dob IS NULL
          OR w.watchlist_dob IS NULL
          OR ABS(c.customer_dob_year - w.watchlist_dob_year) <= 2
        )
        -- Fast block #3: nationality/citizenship alignment when available.
        AND (
          c.nationality IS NULL
          OR COALESCE(w.nationality_country, w.citizenship_country) IS NULL
          OR UPPER(c.nationality) = UPPER(COALESCE(w.nationality_country, w.citizenship_country))
        )
      )
      OR (
        -- Recall guard: keep same-last-name pairs even if one of the other blocks misses.
        c.customer_last_name IS NOT NULL
        AND w.entity_last_name IS NOT NULL
        AND c.customer_last_name <> ''
        AND w.entity_last_name <> ''
        AND c.customer_last_name = w.entity_last_name
      )
  ),
  base AS (
        SELECT
      cp.customer_id,
      cp.full_name,
      cp.customer_dob,
      cp.nationality,
      cp.entity_id,
      cp.entity_name,
      cp.entity_aliases,
      cp.watchlist_dob,
      cp.nationality_country,
      cp.citizenship_country,
      SCREENING.JARO_WINKLER_SIMILARITY(cp.full_name, cp.entity_name) AS name_sim
    FROM candidate_pairs cp
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
  const hasCombinedScore = await hasLayer2CombinedScoreColumn();
  const result = await executeQuery<Record<string, unknown>>(
    hasCombinedScore
      ? `
    SELECT result_id, flag_id, customer_id, entity_id, ai_confidence, combined_score, routing,
           reasoning, matching_signals, conflicting_signals, sources,
           customer_background, sanctions_background,
           TO_CHAR(processed_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS processed_at
    FROM SCREENING.LAYER2_RESULTS
    ORDER BY combined_score DESC
  `
      : `
    SELECT result_id, flag_id, customer_id, entity_id, ai_confidence,
           ai_confidence AS combined_score, routing,
           reasoning, matching_signals, conflicting_signals, sources,
           '' AS customer_background, '' AS sanctions_background,
           TO_CHAR(processed_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS processed_at
    FROM SCREENING.LAYER2_RESULTS
    ORDER BY ai_confidence DESC
  `
  );
  return result.rows.map((r) => ({
    result_id: String(r.result_id),
    flag_id: String(r.flag_id),
    customer_id: String(r.customer_id),
    entity_id: String(r.entity_id),
    ai_confidence: Number(r.ai_confidence),
    combined_score: Number(r.combined_score ?? r.ai_confidence),
    routing: String(r.routing) as Layer2Result["routing"],
    reasoning: String(r.reasoning ?? ""),
    matching_signals: (r.matching_signals as string[]) ?? [],
    conflicting_signals: (r.conflicting_signals as string[]) ?? [],
    sources: (r.sources as Layer2Result["sources"]) ?? [],
    customer_background: String(r.customer_background ?? ""),
    sanctions_background: String(r.sanctions_background ?? ""),
    processed_at: String(r.processed_at ?? ""),
  }));
}

export async function fetchLayer2ByResultId(id: string): Promise<Layer2Result | null> {
  const hasCombinedScore = await hasLayer2CombinedScoreColumn();
  const result = await executeQuery<Record<string, unknown>>(
    hasCombinedScore
      ? `
    SELECT result_id, flag_id, customer_id, entity_id, ai_confidence, combined_score, routing,
           reasoning, matching_signals, conflicting_signals, sources,
           customer_background, sanctions_background,
           TO_CHAR(processed_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS processed_at
    FROM SCREENING.LAYER2_RESULTS
    WHERE result_id = '${id.replace(/'/g, "''")}'
  `
      : `
    SELECT result_id, flag_id, customer_id, entity_id, ai_confidence,
           ai_confidence AS combined_score, routing,
           reasoning, matching_signals, conflicting_signals, sources,
           '' AS customer_background, '' AS sanctions_background,
           TO_CHAR(processed_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS processed_at
    FROM SCREENING.LAYER2_RESULTS
    WHERE result_id = '${id.replace(/'/g, "''")}'
  `
  );
  if (result.rows.length === 0) return null;
  const r = result.rows[0];
  return {
    result_id: String(r.result_id),
    flag_id: String(r.flag_id),
    customer_id: String(r.customer_id),
    entity_id: String(r.entity_id),
    ai_confidence: Number(r.ai_confidence),
    combined_score: Number(r.combined_score ?? r.ai_confidence),
    routing: String(r.routing) as Layer2Result["routing"],
    reasoning: String(r.reasoning ?? ""),
    matching_signals: (r.matching_signals as string[]) ?? [],
    conflicting_signals: (r.conflicting_signals as string[]) ?? [],
    sources: (r.sources as Layer2Result["sources"]) ?? [],
    customer_background: String(r.customer_background ?? ""),
    sanctions_background: String(r.sanctions_background ?? ""),
    processed_at: String(r.processed_at ?? ""),
  };
}

// ── Layer 2 input builder ────────────────────────────────────────────

import type { Layer2Input } from "./layer2";

/**
 * For each Layer 1 flag, fetch the associated customer and sanctions entry.
 * Returns an array ready to pass to processBatch().
 */
export async function buildLayer2Inputs(flags: Layer1Flag[]): Promise<Layer2Input[]> {
  if (flags.length === 0) return [];

  const escapedFlagIds = flags.map((f) => `'${f.flag_id.replace(/'/g, "''")}'`).join(",");
  const byId = new Map(flags.map((f) => [f.flag_id, f]));

  const rows = await executeQuery<Record<string, unknown>>(`
    SELECT
      f.flag_id,
      c.customer_id,
      c.full_name,
      TO_CHAR(c.dob, 'YYYY-MM-DD') AS customer_dob,
      c.nationality,
      c.email,
      c.entity_type,
      TO_CHAR(c.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS customer_created_at,
      w.entity_id,
      w.sr_no,
      w.listing_country,
      w.authority,
      w.list_name,
      w.entity_type AS watchlist_entity_type,
      w.entity_name,
      w.entity_aliases,
      TO_CHAR(w.effective_date, 'YYYY-MM-DD') AS effective_date,
      TO_CHAR(w.expiry_date, 'YYYY-MM-DD') AS expiry_date,
      w.entity_notes,
      w.citation_link,
      w.address,
      w.country,
      w.nationality_country,
      w.citizenship_country,
      TO_CHAR(w.dob, 'YYYY-MM-DD') AS watchlist_dob,
      w.pob,
      w.call_sign,
      w.vessel_type,
      w.vessel_flag,
      w.vessel_owner,
      w.gross_tonnage,
      w.gross_registered_tonnage
    FROM SCREENING.LAYER1_FLAGS f
    JOIN CUSTOMERS.ONBOARDING c ON c.customer_id = f.customer_id
    JOIN WATCHLIST.SANCTIONS_PEP w ON w.entity_id = f.entity_id
    WHERE f.flag_id IN (${escapedFlagIds})
    ORDER BY f.composite_score DESC
  `);

  const inputs: Layer2Input[] = [];
  for (const r of rows.rows) {
    const flagId = String(r.flag_id ?? "");
    const flag = byId.get(flagId);
    if (!flag) continue;

    const customer: Customer = {
      customer_id: String(r.customer_id ?? ""),
      full_name: String(r.full_name ?? ""),
      dob: String(r.customer_dob ?? ""),
      nationality: String(r.nationality ?? ""),
      email: String(r.email ?? ""),
      entity_type: String(r.entity_type ?? "INDIVIDUAL") as Customer["entity_type"],
      created_at: String(r.customer_created_at ?? ""),
    };

    const sanctions: SanctionsEntry = {
      entity_id: String(r.entity_id ?? ""),
      sr_no: Number(r.sr_no ?? 0),
      listing_country: String(r.listing_country ?? ""),
      authority: String(r.authority ?? ""),
      list_name: String(r.list_name ?? ""),
      entity_type: String(r.watchlist_entity_type ?? ""),
      entity_name: String(r.entity_name ?? ""),
      entity_aliases: String(r.entity_aliases ?? ""),
      effective_date: String(r.effective_date ?? ""),
      expiry_date: r.expiry_date ? String(r.expiry_date) : null,
      entity_notes: String(r.entity_notes ?? ""),
      citation_link: String(r.citation_link ?? ""),
      address: String(r.address ?? ""),
      country: String(r.country ?? ""),
      nationality_country: String(r.nationality_country ?? ""),
      citizenship_country: String(r.citizenship_country ?? ""),
      dob: String(r.watchlist_dob ?? ""),
      pob: String(r.pob ?? ""),
      call_sign: r.call_sign ? String(r.call_sign) : null,
      vessel_type: r.vessel_type ? String(r.vessel_type) : null,
      vessel_flag: r.vessel_flag ? String(r.vessel_flag) : null,
      vessel_owner: r.vessel_owner ? String(r.vessel_owner) : null,
      gross_tonnage: r.gross_tonnage ? String(r.gross_tonnage) : null,
      gross_registered_tonnage: r.gross_registered_tonnage
        ? Number(r.gross_registered_tonnage)
        : null,
    };

    inputs.push({ customer, sanctions, flag });
  }

  return inputs;
}

// ── Layer 2 result saver ─────────────────────────────────────────────

/**
 * Persist Layer 2 results to Snowflake:
 * - Clears the previous run's results
 * - Inserts every result into LAYER2_RESULTS
 * - For AUTO_RESTRICT: inserts into DECISIONS.RESTRICTIONS + AUDIT.LOG
 * - For AUTO_CLEAR: inserts into DECISIONS.CLEARANCES + AUDIT.LOG
 * - For HUMAN_REVIEW: inserts into QUEUE.PENDING_REVIEW + AUDIT.LOG
 */
export async function saveLayer2Results(
  results: Layer2Result[],
  options?: { clearExisting?: boolean }
): Promise<void> {
  const esc = (s: string) => String(s ?? "").replace(/'/g, "''");
  const hasCombinedScore = await hasLayer2CombinedScoreColumn();
  const clearExisting = options?.clearExisting ?? true;

  // Clean previous run only when requested (first batch in incremental mode).
  if (clearExisting) {
    await executeStatement(`TRUNCATE TABLE SCREENING.LAYER2_RESULTS`);
    await executeStatement(`DELETE FROM QUEUE.PENDING_REVIEW WHERE status = 'PENDING'`);
  }

  for (const r of results) {
    const matchingJson = JSON.stringify(r.matching_signals ?? []).replace(/'/g, "''");
    const conflictingJson = JSON.stringify(r.conflicting_signals ?? []).replace(/'/g, "''");
    const sourcesJson = JSON.stringify(r.sources ?? []).replace(/'/g, "''");

    // Insert result
    try {
      if (hasCombinedScore) {
        await executeStatement(`
          INSERT INTO SCREENING.LAYER2_RESULTS
            (result_id, flag_id, customer_id, entity_id, ai_confidence, combined_score,
             routing, reasoning, matching_signals, conflicting_signals, sources,
             customer_background, sanctions_background)
          VALUES (
            '${esc(r.result_id)}', '${esc(r.flag_id)}', '${esc(r.customer_id)}', '${esc(r.entity_id)}',
            ${r.ai_confidence}, ${r.combined_score},
            '${esc(r.routing)}', '${esc(r.reasoning)}',
            PARSE_JSON('${matchingJson}'), PARSE_JSON('${conflictingJson}'), PARSE_JSON('${sourcesJson}'),
            '${esc(r.customer_background)}', '${esc(r.sanctions_background)}'
          )
        `);
      } else {
        await executeStatement(`
          INSERT INTO SCREENING.LAYER2_RESULTS
            (result_id, flag_id, customer_id, entity_id, ai_confidence,
             routing, reasoning, matching_signals, conflicting_signals, sources)
          VALUES (
            '${esc(r.result_id)}', '${esc(r.flag_id)}', '${esc(r.customer_id)}', '${esc(r.entity_id)}',
            ${r.ai_confidence},
            '${esc(r.routing)}', '${esc(r.reasoning)}',
            PARSE_JSON('${matchingJson}'), PARSE_JSON('${conflictingJson}'), PARSE_JSON('${sourcesJson}')
          )
        `);
      }
    } catch (error) {
      const message = String(error);
      if (!message.includes("PARSE_JSON") || !message.includes("VALUES clause")) {
        throw error;
      }

      // Some Snowflake environments reject PARSE_JSON() in INSERT ... VALUES.
      // Fallback to NULL for JSON columns so the run still completes.
      if (hasCombinedScore) {
        await executeStatement(`
          INSERT INTO SCREENING.LAYER2_RESULTS
            (result_id, flag_id, customer_id, entity_id, ai_confidence, combined_score,
             routing, reasoning, matching_signals, conflicting_signals, sources,
             customer_background, sanctions_background)
          VALUES (
            '${esc(r.result_id)}', '${esc(r.flag_id)}', '${esc(r.customer_id)}', '${esc(r.entity_id)}',
            ${r.ai_confidence}, ${r.combined_score},
            '${esc(r.routing)}', '${esc(r.reasoning)}',
            NULL, NULL, NULL,
            '${esc(r.customer_background)}', '${esc(r.sanctions_background)}'
          )
        `);
      } else {
        await executeStatement(`
          INSERT INTO SCREENING.LAYER2_RESULTS
            (result_id, flag_id, customer_id, entity_id, ai_confidence,
             routing, reasoning, matching_signals, conflicting_signals, sources)
          VALUES (
            '${esc(r.result_id)}', '${esc(r.flag_id)}', '${esc(r.customer_id)}', '${esc(r.entity_id)}',
            ${r.ai_confidence},
            '${esc(r.routing)}', '${esc(r.reasoning)}',
            NULL, NULL, NULL
          )
        `);
      }
    }

    if (r.routing === "AUTO_RESTRICT") {
      const decisionId = `DEC-AUTO-R-${r.customer_id}-${Date.now()}`;
      await executeStatement(`
        INSERT INTO DECISIONS.RESTRICTIONS
          (decision_id, customer_id, result_id, trigger_type, analyst_id, reason_category, analyst_note)
        VALUES (
          '${decisionId}', '${esc(r.customer_id)}', '${esc(r.result_id)}',
          'AUTO', NULL, 'Combined score >= auto-restrict threshold', 'Auto-restricted by Layer 2 AI screening'
        )
      `);
      await executeStatement(`
        INSERT INTO AUDIT.LOG (log_id, customer_id, layer, event_type, payload)
        VALUES (
          'AUDIT-L2-AR-${Date.now()}-${esc(r.customer_id)}',
          '${esc(r.customer_id)}', 2, 'AUTO_RESTRICTED', NULL
        )
      `);
    } else if (r.routing === "AUTO_CLEAR") {
      const decisionId = `DEC-AUTO-C-${r.customer_id}-${Date.now()}`;
      await executeStatement(`
        INSERT INTO DECISIONS.CLEARANCES
          (decision_id, customer_id, result_id, trigger_type, analyst_id, reason_category, analyst_note)
        VALUES (
          '${decisionId}', '${esc(r.customer_id)}', '${esc(r.result_id)}',
          'AUTO', NULL, 'Combined score <= auto-clear threshold', 'Auto-cleared by Layer 2 AI screening'
        )
      `);
      await executeStatement(`
        INSERT INTO AUDIT.LOG (log_id, customer_id, layer, event_type, payload)
        VALUES (
          'AUDIT-L2-AC-${Date.now()}-${esc(r.customer_id)}',
          '${esc(r.customer_id)}', 2, 'AUTO_CLEARED', NULL
        )
      `);
    } else {
      // HUMAN_REVIEW → push to queue
      const queueId = `Q-${r.customer_id}-${Date.now()}`;
      await executeStatement(`
        INSERT INTO QUEUE.PENDING_REVIEW
          (queue_id, result_id, customer_id, entity_id, ai_confidence, status)
        VALUES (
          '${queueId}', '${esc(r.result_id)}', '${esc(r.customer_id)}',
          '${esc(r.entity_id)}', ${r.ai_confidence}, 'PENDING'
        )
      `);
      await executeStatement(`
        INSERT INTO AUDIT.LOG (log_id, customer_id, layer, event_type, payload)
        VALUES (
          'AUDIT-L2-HR-${Date.now()}-${esc(r.customer_id)}',
          '${esc(r.customer_id)}', 2, 'QUEUED_FOR_REVIEW', NULL
        )
      `);
    }
  }
}

export async function runLayer2Processing(): Promise<{
  total: number;
  auto_restrict: number;
  auto_clear: number;
  human_review: number;
}> {
  // This function is now a thin summary query — the actual processing
  // is orchestrated by the API route using processBatch() + saveLayer2Results().
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

export async function fetchQueue(limit = 25): Promise<
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
