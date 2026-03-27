// ── Screening Domain Types ──────────────────────────────────────────

// Real Snowflake schema: SNOWFLAKE_SAMPLE_DATA.TPCDS_SF100TCL.CUSTOMER
export interface SnowflakeCustomer {
  c_customer_sk: number;
  c_customer_id: string;
  c_current_cdemo_sk: number | null;
  c_current_hdemo_sk: number | null;
  c_current_addr_sk: number | null;
  c_first_shipto_date_sk: number | null;
  c_first_sales_date_sk: number | null;
  c_salutation: string | null;
  c_first_name: string | null;
  c_last_name: string | null;
  c_preferred_cust_flag: string | null;
  c_birth_day: number | null;
  c_birth_month: number | null;
  c_birth_year: number | null;
  c_birth_country: string | null;
  c_login: string | null;
  c_email_address: string | null;
  c_last_review_date: string | null;
}

// Normalized customer for screening (derived from SnowflakeCustomer)
export interface Customer {
  customer_id: string;
  full_name: string;
  dob: string; // ISO date
  nationality: string;
  email: string;
  entity_type: "INDIVIDUAL" | "BUSINESS";
  created_at: string;
}

// Real Snowflake schema: GLOBAL_SANCTIONS_DATA.SANCTIONS_DATAFEED
export interface SanctionsEntry {
  sr_no: number;
  entity_id: string;
  listing_country: string;
  authority: string;
  list_name: string;
  entity_type: string;
  entity_name: string;
  entity_aliases: string; // pipe or comma separated
  effective_date: string;
  expiry_date: string | null;
  entity_notes: string;
  citation_link: string;
  address: string;
  country: string;
  nationality_country: string;
  citizenship_country: string;
  dob: string;
  pob: string;
  call_sign: string | null;
  vessel_type: string | null;
  vessel_flag: string | null;
  vessel_owner: string | null;
  gross_tonnage: string | null;
  gross_registered_tonnage: number | null;
}

// Helper to normalize a Snowflake customer row into our Customer type
export function normalizeCustomer(row: SnowflakeCustomer): Customer {
  const firstName = row.c_first_name ?? "";
  const lastName = row.c_last_name ?? "";
  const dob =
    row.c_birth_year && row.c_birth_month && row.c_birth_day
      ? `${row.c_birth_year}-${String(row.c_birth_month).padStart(2, "0")}-${String(row.c_birth_day).padStart(2, "0")}`
      : "";
  return {
    customer_id: row.c_customer_id,
    full_name: `${firstName} ${lastName}`.trim(),
    dob,
    nationality: row.c_birth_country ?? "",
    email: row.c_email_address ?? "",
    entity_type: "INDIVIDUAL",
    created_at: row.c_last_review_date ?? new Date().toISOString(),
  };
}

// ── Layer 1 ─────────────────────────────────────────────────────────

export interface Layer1Flag {
  flag_id: string;
  customer_id: string;
  entity_id: string;
  composite_score: number;
  name_score: number;
  dob_score: number;
  nationality_score: number;
  created_at: string;
}

// ── Layer 2 ─────────────────────────────────────────────────────────

export type RoutingDecision = "AUTO_RESTRICT" | "AUTO_CLEAR" | "HUMAN_REVIEW";

export interface Source {
  label: string;
  url: string;
}

export interface Layer2Result {
  result_id: string;
  flag_id: string;
  customer_id: string;
  entity_id: string;
  ai_confidence: number;
  routing: RoutingDecision;
  reasoning: string;
  matching_signals: string[];
  conflicting_signals: string[];
  sources: Source[];
  processed_at: string;
}

// ── Queue ───────────────────────────────────────────────────────────

export type QueueStatus = "PENDING" | "IN_REVIEW" | "DECIDED";

export interface QueueItem {
  queue_id: string;
  result_id: string;
  customer_id: string;
  entity_id: string;
  ai_confidence: number;
  assigned_to: string | null;
  queued_at: string;
  status: QueueStatus;
}

// ── Decisions ───────────────────────────────────────────────────────

export type DecisionType = "APPROVE" | "REJECT";
export type TriggerType = "AUTO" | "HUMAN";

export interface Decision {
  decision_id: string;
  customer_id: string;
  result_id: string;
  trigger_type: TriggerType;
  analyst_id: string | null;
  reason_category: string;
  analyst_note: string;
  decided_at: string;
}

// ── Audit ───────────────────────────────────────────────────────────

export interface AuditEntry {
  log_id: string;
  customer_id: string;
  layer: 1 | 2 | 3;
  event_type: string;
  payload: Record<string, unknown>;
  analyst_id: string | null;
  ai_chat_transcript: string | null;
  created_at: string;
}

// ── Enriched types for UI ───────────────────────────────────────────

export interface ReviewCase {
  queue: QueueItem;
  customer: Customer;
  watchlist: SanctionsEntry;
  layer1: Layer1Flag;
  layer2: Layer2Result;
}

export const APPROVE_REASONS = [
  "Name collision — confirmed different person",
  "DOB mismatch — likely false positive",
  "Nationality mismatch — different individual",
  "No corroborating evidence found",
  "Customer provided additional ID confirming identity",
  "Other",
] as const;

export const REJECT_REASONS = [
  "Name + DOB + nationality all match",
  "Multiple independent sources corroborate",
  "Alias confirmed through documentation",
  "Linked entity / associate of sanctioned person",
  "Customer confirmed as designated person",
  "Other",
] as const;
