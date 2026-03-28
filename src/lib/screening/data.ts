// Mock data for demo — simulates Snowflake tables
// In production, all reads come from Snowflake via SQL API

import type {
  Customer,
  SanctionsEntry,
  Layer1Flag,
  Layer2Result,
  QueueItem,
  Decision,
  AuditEntry,
} from "@/types/screening";

// ── Mock Customers (onboarding batch) ───────────────────────────────

export const MOCK_CUSTOMERS: Customer[] = [
  {
    customer_id: "AAAAAAAAGOKAAAAA",
    full_name: "Ahmad Al-Hassan",
    dob: "1978-03-15",
    nationality: "LEBANON",
    email: "ahmad.alhassan@example.com",
    entity_type: "INDIVIDUAL",
    created_at: "2026-03-27T08:00:00Z",
  },
  {
    customer_id: "AAAAAAAABPKAAAAA",
    full_name: "Viktor Petrov",
    dob: "1965-11-22",
    nationality: "RUSSIA",
    email: "v.petrov@example.com",
    entity_type: "INDIVIDUAL",
    created_at: "2026-03-27T08:00:00Z",
  },
  {
    customer_id: "AAAAAAAACNKAAAAA",
    full_name: "John Smith",
    dob: "1990-06-10",
    nationality: "UNITED STATES",
    email: "john.smith@example.com",
    entity_type: "INDIVIDUAL",
    created_at: "2026-03-27T08:00:00Z",
  },
  {
    customer_id: "AAAAAAAADLKAAAAA",
    full_name: "Maria Santos Rodriguez",
    dob: "1985-09-03",
    nationality: "MEXICO",
    email: "m.santos@example.com",
    entity_type: "INDIVIDUAL",
    created_at: "2026-03-27T08:00:00Z",
  },
  {
    customer_id: "AAAAAAAAEKKAAAAA",
    full_name: "Chen Wei",
    dob: "1972-01-28",
    nationality: "CHINA",
    email: "chen.wei@example.com",
    entity_type: "INDIVIDUAL",
    created_at: "2026-03-27T08:00:00Z",
  },
];

// ── Mock Sanctions / Watchlist (GLOBAL_SANCTIONS_DATA.SANCTIONS_DATAFEED) ──

export const MOCK_SANCTIONS: SanctionsEntry[] = [
  {
    sr_no: 1,
    entity_id: "OFAC-12345",
    listing_country: "US",
    authority: "OFAC",
    list_name: "SDN List",
    entity_type: "Individual",
    entity_name: "Ahmad Al-Hassan",
    entity_aliases: "Ahmad Hassan; Ahmed Al Hassan; Abu Ahmad",
    effective_date: "2023-01-15",
    expiry_date: null,
    entity_notes:
      "Designated for providing financial facilitation services to designated entities in the Middle East region.",
    citation_link: "https://ofac.treasury.gov/recent-actions/20230115",
    address: "Beirut, Lebanon",
    country: "LB",
    nationality_country: "LB",
    citizenship_country: "LB",
    dob: "1976-05-20",
    pob: "Tripoli, Lebanon",
    call_sign: null,
    vessel_type: null,
    vessel_flag: null,
    vessel_owner: null,
    gross_tonnage: null,
    gross_registered_tonnage: null,
  },
  {
    sr_no: 2,
    entity_id: "OFAC-67890",
    listing_country: "US",
    authority: "OFAC",
    list_name: "SDN List",
    entity_type: "Individual",
    entity_name: "Viktor Sergeyevich Petrov",
    entity_aliases: "Viktor Petrov; V. Petrov; Виктор Петров",
    effective_date: "2022-06-10",
    expiry_date: null,
    entity_notes:
      "Designated pursuant to E.O. 14024 for operating in the financial services sector of the Russian Federation economy. Known associate of sanctioned oligarch network.",
    citation_link: "https://ofac.treasury.gov/recent-actions/20220610",
    address: "Moscow, Russia",
    country: "RU",
    nationality_country: "RU",
    citizenship_country: "RU",
    dob: "1965-11-22",
    pob: "Saint Petersburg, Russia",
    call_sign: null,
    vessel_type: null,
    vessel_flag: null,
    vessel_owner: null,
    gross_tonnage: null,
    gross_registered_tonnage: null,
  },
  {
    sr_no: 3,
    entity_id: "UN-54321",
    listing_country: "INTL",
    authority: "UN",
    list_name: "UN Security Council Consolidated List",
    entity_type: "Individual",
    entity_name: "John Michael Smith",
    entity_aliases: "J. Smith",
    effective_date: "2019-08-22",
    expiry_date: null,
    entity_notes: "Listed for involvement in proliferation financing activities.",
    citation_link: "https://www.un.org/securitycouncil/sanctions/list",
    address: "London, United Kingdom",
    country: "GB",
    nationality_country: "GB",
    citizenship_country: "GB",
    dob: "1970-02-14",
    pob: "London, UK",
    call_sign: null,
    vessel_type: null,
    vessel_flag: null,
    vessel_owner: null,
    gross_tonnage: null,
    gross_registered_tonnage: null,
  },
  {
    sr_no: 4,
    entity_id: "EU-11111",
    listing_country: "EU",
    authority: "EU",
    list_name: "EU Sanctions List",
    entity_type: "Individual",
    entity_name: "Maria Santos",
    entity_aliases: "M. Santos; Maria S. Rodriguez",
    effective_date: "2024-03-01",
    expiry_date: null,
    entity_notes:
      "Listed for involvement in drug trafficking networks operating across Central America.",
    citation_link: "https://ec.europa.eu/sanctions",
    address: "Mexico City, Mexico",
    country: "MX",
    nationality_country: "MX",
    citizenship_country: "MX",
    dob: "1983-12-18",
    pob: "Guadalajara, Mexico",
    call_sign: null,
    vessel_type: null,
    vessel_flag: null,
    vessel_owner: null,
    gross_tonnage: null,
    gross_registered_tonnage: null,
  },
  {
    sr_no: 5,
    entity_id: "OFAC-99999",
    listing_country: "US",
    authority: "OFAC",
    list_name: "SDN List",
    entity_type: "Individual",
    entity_name: "Chen Wei Lin",
    entity_aliases: "Chen Wei; C.W. Lin",
    effective_date: "2024-09-15",
    expiry_date: null,
    entity_notes:
      "Designated for facilitating technology transfer to entities supporting advanced weapons programs.",
    citation_link: "https://ofac.treasury.gov/recent-actions/20240915",
    address: "Shenzhen, China",
    country: "CN",
    nationality_country: "CN",
    citizenship_country: "CN",
    dob: "1972-01-28",
    pob: "Shanghai, China",
    call_sign: null,
    vessel_type: null,
    vessel_flag: null,
    vessel_owner: null,
    gross_tonnage: null,
    gross_registered_tonnage: null,
  },
];

// ── Layer 1 Flags (output of deterministic screening) ───────────────

export const MOCK_LAYER1_FLAGS: Layer1Flag[] = [
  {
    flag_id: "FLAG-001",
    customer_id: "AAAAAAAAGOKAAAAA",
    entity_id: "OFAC-12345",
    composite_score: 85,
    name_score: 0.95,
    dob_score: 15,
    nationality_score: 20,
    created_at: "2026-03-27T08:05:00Z",
  },
  {
    flag_id: "FLAG-002",
    customer_id: "AAAAAAAABPKAAAAA",
    entity_id: "OFAC-67890",
    composite_score: 120,
    name_score: 0.88,
    dob_score: 30,
    nationality_score: 20,
    created_at: "2026-03-27T08:05:00Z",
  },
  {
    flag_id: "FLAG-003",
    customer_id: "AAAAAAAACNKAAAAA",
    entity_id: "UN-54321",
    composite_score: 50,
    name_score: 0.82,
    dob_score: 0,
    nationality_score: -10,
    created_at: "2026-03-27T08:05:00Z",
  },
  {
    flag_id: "FLAG-004",
    customer_id: "AAAAAAAADLKAAAAA",
    entity_id: "EU-11111",
    composite_score: 75,
    name_score: 0.85,
    dob_score: 15,
    nationality_score: 20,
    created_at: "2026-03-27T08:05:00Z",
  },
  {
    flag_id: "FLAG-005",
    customer_id: "AAAAAAAAEKKAAAAA",
    entity_id: "OFAC-99999",
    composite_score: 120,
    name_score: 0.92,
    dob_score: 30,
    nationality_score: 20,
    created_at: "2026-03-27T08:05:00Z",
  },
];

// ── Layer 2 Results (AI processing output) ──────────────────────────

export const MOCK_LAYER2_RESULTS: Layer2Result[] = [
  {
    result_id: "L2-001",
    flag_id: "FLAG-001",
    customer_id: "AAAAAAAAGOKAAAAA",
    entity_id: "OFAC-12345",
    ai_confidence: 58,
    routing: "HUMAN_REVIEW",
    reasoning:
      "Name and nationality match exactly. DOB differs by 2 years — could indicate data entry error or deliberate obfuscation. Online search found no public reporting linking this individual to financial crimes. OFAC record cites 2023 designation for financial facilitation. Alias 'Ahmad Hassan' matches customer's known alias per bank records. Insufficient certainty to auto-restrict or auto-clear.",
    matching_signals: ["name_exact", "nationality_match", "alias_partial_match"],
    conflicting_signals: ["dob_2yr_discrepancy", "no_public_corroboration"],
    sources: [
      { label: "OFAC SDN Designation Notice — Jan 2023", url: "https://ofac.treasury.gov/recent-actions/20230115" },
      { label: "Reuters — OFAC designates Lebanese financial facilitator", url: "https://reuters.com/world/middle-east/ofac-sanctions-2023-01-15" },
    ],
    processed_at: "2026-03-27T08:10:00Z",
  },
  {
    result_id: "L2-002",
    flag_id: "FLAG-002",
    customer_id: "AAAAAAAABPKAAAAA",
    entity_id: "OFAC-67890",
    ai_confidence: 95,
    routing: "AUTO_RESTRICT",
    reasoning:
      "Very high confidence match. Full name 'Viktor Petrov' closely matches sanctioned 'Viktor Sergeyevich Petrov'. Exact DOB match (1965-11-22). Nationality matches (Russian Federation). Multiple independent sources corroborate: Reuters and Financial Times both report on this individual's designation under E.O. 14024. Customer's passport number format consistent with Russian Federation issuance. Auto-restricting based on overwhelming evidence.",
    matching_signals: ["name_high_similarity", "dob_exact", "nationality_match", "multiple_source_corroboration"],
    conflicting_signals: [],
    sources: [
      { label: "OFAC SDN Designation — June 2022", url: "https://ofac.treasury.gov/recent-actions/20220610" },
      { label: "Reuters — Russia sanctions expansion", url: "https://reuters.com/business/finance/russia-sanctions-2022" },
      { label: "Financial Times — Oligarch network exposed", url: "https://ft.com/content/russia-oligarch-network-2022" },
    ],
    processed_at: "2026-03-27T08:10:00Z",
  },
  {
    result_id: "L2-003",
    flag_id: "FLAG-003",
    customer_id: "AAAAAAAACNKAAAAA",
    entity_id: "UN-54321",
    ai_confidence: 6,
    routing: "AUTO_CLEAR",
    reasoning:
      "Very low confidence match. While the surname 'Smith' matches, this is an extremely common name. Customer is a 35-year-old US citizen; watchlist entry is a 56-year-old UK citizen. DOB differs by 20 years. Nationality does not match. No aliases overlap. Online search reveals no connection between customer and any sanctioned activity. This is a clear name collision false positive.",
    matching_signals: ["surname_match_only"],
    conflicting_signals: ["dob_20yr_discrepancy", "nationality_mismatch", "no_alias_overlap", "age_mismatch", "no_public_connection"],
    sources: [
      { label: "UN Security Council Consolidated List", url: "https://www.un.org/securitycouncil/sanctions/list" },
    ],
    processed_at: "2026-03-27T08:10:00Z",
  },
  {
    result_id: "L2-004",
    flag_id: "FLAG-004",
    customer_id: "AAAAAAAADLKAAAAA",
    entity_id: "EU-11111",
    ai_confidence: 42,
    routing: "HUMAN_REVIEW",
    reasoning:
      "Moderate confidence. Customer 'Maria Santos Rodriguez' partially matches EU-listed 'Maria Santos'. Nationality matches (Mexican). DOB differs by approximately 2 years. The alias 'Maria S. Rodriguez' on the watchlist is close to the customer's full name. However, 'Maria Santos' is a relatively common Hispanic name. Online search found limited information linking either individual to the specific drug trafficking allegations. Further investigation warranted.",
    matching_signals: ["name_partial_match", "nationality_match", "alias_similarity"],
    conflicting_signals: ["dob_2yr_discrepancy", "common_name", "limited_corroboration"],
    sources: [
      { label: "EU Sanctions List — Council Regulation", url: "https://ec.europa.eu/sanctions" },
      { label: "DEA Report — Central American drug networks", url: "https://dea.gov/reports/central-america-2024" },
    ],
    processed_at: "2026-03-27T08:10:00Z",
  },
  {
    result_id: "L2-005",
    flag_id: "FLAG-005",
    customer_id: "AAAAAAAAEKKAAAAA",
    entity_id: "OFAC-99999",
    ai_confidence: 72,
    routing: "HUMAN_REVIEW",
    reasoning:
      "High-moderate confidence. Customer 'Chen Wei' matches sanctioned 'Chen Wei Lin' — the customer name appears to be a substring. Exact DOB match. Nationality matches (Chinese). The alias 'Chen Wei' on the sanctions list exactly matches the customer's full name. However, 'Chen Wei' is an extremely common Chinese name. OFAC designation is for technology transfer activities. Customer's occupation and business dealings should be verified. One news article from South China Morning Post references the OFAC designation.",
    matching_signals: ["name_substring_match", "dob_exact", "nationality_match", "alias_exact_match"],
    conflicting_signals: ["extremely_common_name", "occupation_unverified"],
    sources: [
      { label: "OFAC SDN Designation — Sep 2024", url: "https://ofac.treasury.gov/recent-actions/20240915" },
      { label: "SCMP — US sanctions Chinese tech facilitators", url: "https://scmp.com/tech/us-sanctions-china-2024" },
    ],
    processed_at: "2026-03-27T08:10:00Z",
  },
];

// ── Queue Items (human review cases) ────────────────────────────────

export const MOCK_QUEUE: QueueItem[] = [
  {
    queue_id: "Q-001",
    result_id: "L2-001",
    customer_id: "AAAAAAAAGOKAAAAA",
    entity_id: "OFAC-12345",
    ai_confidence: 58,
    assigned_to: null,
    queued_at: "2026-03-27T08:11:00Z",
    status: "PENDING",
  },
  {
    queue_id: "Q-002",
    result_id: "L2-004",
    customer_id: "AAAAAAAADLKAAAAA",
    entity_id: "EU-11111",
    ai_confidence: 42,
    assigned_to: null,
    queued_at: "2026-03-27T08:11:00Z",
    status: "PENDING",
  },
  {
    queue_id: "Q-003",
    result_id: "L2-005",
    customer_id: "AAAAAAAAEKKAAAAA",
    entity_id: "OFAC-99999",
    ai_confidence: 72,
    assigned_to: null,
    queued_at: "2026-03-27T08:11:00Z",
    status: "PENDING",
  },
];

// ── Mutable stores for demo (simulating Snowflake writes) ───────────

export const decisions: Decision[] = [];
export const auditLog: AuditEntry[] = [];

// Helper to find data by ID
export function findCustomer(id: string) {
  return MOCK_CUSTOMERS.find((c) => c.customer_id === id);
}
export function findSanctionsEntry(id: string) {
  return MOCK_SANCTIONS.find((s) => s.entity_id === id);
}
export function findLayer1Flag(flagId: string) {
  return MOCK_LAYER1_FLAGS.find((f) => f.flag_id === flagId);
}
export function findLayer2Result(resultId: string) {
  return MOCK_LAYER2_RESULTS.find((r) => r.result_id === resultId);
}
export function findQueueItem(queueId: string) {
  return MOCK_QUEUE.find((q) => q.queue_id === queueId);
}
export function findLayer2ByCustomer(customerId: string) {
  return MOCK_LAYER2_RESULTS.find((r) => r.customer_id === customerId);
}
export function findLayer1ByCustomer(customerId: string) {
  return MOCK_LAYER1_FLAGS.find((f) => f.customer_id === customerId);
}
