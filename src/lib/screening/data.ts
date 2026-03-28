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
// combined_score = (layer1_normalized * 0.3) + (ai_confidence * 0.7)
// layer1_normalized = Math.min(100, composite_score / 120 * 100)
// Routing thresholds: autoRestrict >= 85, autoClear <= 20

export const MOCK_LAYER2_RESULTS: Layer2Result[] = [
  {
    result_id: "L2-001",
    flag_id: "FLAG-001",
    customer_id: "AAAAAAAAGOKAAAAA",
    entity_id: "OFAC-12345",
    ai_confidence: 58,
    // layer1_norm=(85/120*100)=70.8 → combined=(70.8*0.3)+(58*0.7)=21.2+40.6=62
    combined_score: 62,
    routing: "HUMAN_REVIEW",
    reasoning:
      "Step 1 — Customer profile: Online research for Ahmad Al-Hassan (Lebanon, 1978) returns no notable results connecting this individual to financial crime, sanctions, or illicit networks. Social media profiles suggest a private individual. Step 2 — Sanctions entity profile: The OFAC-designated Ahmad Al-Hassan was listed in January 2023 for providing financial facilitation services to designated entities in the Middle East. Reuters and regional news outlets covered the designation. Step 3 — Cross-comparison: Name and nationality match exactly. DOB differs by 2 years (customer: 1978-03-15 vs. sanctioned: 1976-05-20) — this could be a transcription error or deliberate obfuscation, but is also consistent with a false positive. The alias 'Ahmad Hassan' on the watchlist partially matches. Step 4 — Assessment: Insufficient certainty to auto-restrict or auto-clear. The DOB discrepancy is meaningful but not definitive. Human review required to verify identity documents.",
    matching_signals: [
      "Name exact match",
      "Nationality match (Lebanon)",
      "Partial alias overlap: 'Ahmad Hassan'",
    ],
    conflicting_signals: [
      "DOB 2-year discrepancy (1978 vs 1976)",
      "No corroborating public reporting linking customer to designation",
    ],
    customer_background:
      "Online research for Ahmad Al-Hassan from Lebanon (born ~1978) returns no notable results. No news coverage, public records, or open-source intelligence links this individual to financial crime or sanctioned networks.",
    sanctions_background:
      "OFAC designated Ahmad Al-Hassan in January 2023 for providing financial facilitation services to designated entities in the Middle East region. Reuters and Al-Monitor covered the designation. Entity is based in Beirut, born 1976-05-20 in Tripoli.",
    sources: [
      {
        label: "OFAC SDN Designation Notice — Jan 2023",
        url: "https://ofac.treasury.gov/recent-actions/20230115",
      },
      {
        label: "Reuters — OFAC designates Lebanese financial facilitator",
        url: "https://reuters.com/world/middle-east/ofac-sanctions-2023-01-15",
      },
    ],
    processed_at: "2026-03-27T08:10:00Z",
  },
  {
    result_id: "L2-002",
    flag_id: "FLAG-002",
    customer_id: "AAAAAAAABPKAAAAA",
    entity_id: "OFAC-67890",
    ai_confidence: 95,
    // layer1_norm=(120/120*100)=100 → combined=(100*0.3)+(95*0.7)=30+66.5=97
    combined_score: 97,
    routing: "AUTO_RESTRICT",
    reasoning:
      "Step 1 — Customer profile: Online research for Viktor Petrov (Russia, 1965) surfaces multiple financial news articles. One Reuters article from June 2022 specifically names a Viktor Petrov in the context of Russian oligarch network sanctions under E.O. 14024. The described individual operates in the financial services sector, consistent with the customer's profile. Step 2 — Sanctions entity profile: OFAC designated Viktor Sergeyevich Petrov in June 2022 under E.O. 14024 as part of expanded sanctions on Russia's financial services sector. Multiple credible outlets (Reuters, Financial Times, Bloomberg) reported on this designation and described his role in the oligarch network. Step 3 — Cross-comparison: Full name 'Viktor Petrov' (customer) closely matches 'Viktor Sergeyevich Petrov' (sanctioned) with Jaro-Winkler similarity 0.88. DOB is an exact match (1965-11-22). Nationality matches (Russian Federation). The alias 'Viktor Petrov' on the watchlist exactly matches the customer's provided name. Multiple independent news sources corroborate the link. Step 4 — Assessment: Overwhelming evidence of match. Auto-restricting.",
    matching_signals: [
      "Name high similarity (Jaro-Winkler 0.88)",
      "DOB exact match (1965-11-22)",
      "Nationality match (Russia)",
      "Alias 'Viktor Petrov' exact match",
      "Multiple independent news sources corroborate",
    ],
    conflicting_signals: [],
    customer_background:
      "Online research returns multiple financial news articles mentioning a Viktor Petrov from Russia in the context of OFAC sanctions and oligarch networks. A Reuters article from June 2022 specifically names this individual in connection with E.O. 14024 designations.",
    sanctions_background:
      "Viktor Sergeyevich Petrov was designated by OFAC in June 2022 under E.O. 14024 for operating in the financial services sector of the Russian Federation and for his role in an oligarch network. Reuters, Financial Times, and Bloomberg all reported on the designation.",
    sources: [
      {
        label: "OFAC SDN Designation — June 2022",
        url: "https://ofac.treasury.gov/recent-actions/20220610",
      },
      {
        label: "Reuters — Russia sanctions expansion",
        url: "https://reuters.com/business/finance/russia-sanctions-2022",
      },
      {
        label: "Financial Times — Oligarch network exposed",
        url: "https://ft.com/content/russia-oligarch-network-2022",
      },
    ],
    processed_at: "2026-03-27T08:10:00Z",
  },
  {
    result_id: "L2-003",
    flag_id: "FLAG-003",
    customer_id: "AAAAAAAACNKAAAAA",
    entity_id: "UN-54321",
    ai_confidence: 6,
    // layer1_norm=(50/120*100)=41.7 → combined=(41.7*0.3)+(6*0.7)=12.5+4.2=17
    combined_score: 17,
    routing: "AUTO_CLEAR",
    reasoning:
      "Step 1 — Customer profile: John Smith from the United States (born 1990) has no notable online presence connecting him to any sanctioned activity, proliferation financing, or international crime. The name is one of the most common names in the English-speaking world. Step 2 — Sanctions entity profile: The UN-listed 'John Michael Smith' was designated in August 2019 by the UN Security Council for involvement in proliferation financing. He is a UK citizen born in 1970, based in London. Step 3 — Cross-comparison: Surname matches but given names differ (John vs. John Michael). Customer is a 35-year-old US citizen; watchlist entry is a 56-year-old UK national. DOB differs by 20 years. Nationality does not match. No aliases overlap. Step 4 — Assessment: This is a clear name-collision false positive. 'John Smith' is among the most common name combinations in English-speaking countries. The demographic data (age, nationality, DOB) all point to different individuals. Auto-clearing.",
    matching_signals: ["Surname match ('Smith')", "First name partial match ('John')"],
    conflicting_signals: [
      "DOB 20-year discrepancy (1990 vs 1970)",
      "Nationality mismatch (US vs UK)",
      "No alias overlap",
      "No public corroboration of any connection",
      "Extremely common name — high false-positive probability",
    ],
    customer_background:
      "No notable online presence found for John Smith (US, born 1990) beyond generic social profiles. No connection to proliferation financing, international sanctions, or any monitored activity. 'John Smith' is one of the most common English-language name combinations.",
    sanctions_background:
      "UN Security Council listed John Michael Smith in August 2019 for involvement in proliferation financing activities. He is a UK citizen born in London in 1970, last known address in London, UK.",
    sources: [
      {
        label: "UN Security Council Consolidated List",
        url: "https://www.un.org/securitycouncil/sanctions/list",
      },
    ],
    processed_at: "2026-03-27T08:10:00Z",
  },
  {
    result_id: "L2-004",
    flag_id: "FLAG-004",
    customer_id: "AAAAAAAADLKAAAAA",
    entity_id: "EU-11111",
    ai_confidence: 42,
    // layer1_norm=(75/120*100)=62.5 → combined=(62.5*0.3)+(42*0.7)=18.75+29.4=48
    combined_score: 48,
    routing: "HUMAN_REVIEW",
    reasoning:
      "Step 1 — Customer profile: Online research for Maria Santos Rodriguez (Mexico, born 1985) returns limited results. No direct connection found to drug trafficking networks or EU-listed activity. Step 2 — Sanctions entity profile: The EU-listed 'Maria Santos' was designated in March 2024 for involvement in drug trafficking networks operating across Central America. DEA reporting from 2024 references a 'Maria Santos' in this context, though details are limited due to the recent designation. Step 3 — Cross-comparison: Customer 'Maria Santos Rodriguez' partially matches EU-listed 'Maria Santos'. The alias 'Maria S. Rodriguez' on the watchlist is notably close to the customer's full name. Nationality matches (Mexico). DOB differs by approximately 2 years (customer: 1985-09-03 vs. sanctioned: 1983-12-18). Step 4 — Assessment: Moderate confidence. 'Maria Santos' is a common Hispanic name, reducing the weight of the name match. The DOB difference introduces uncertainty. The alias similarity to the customer's full name is notable but not conclusive. Human review required to verify identity.",
    matching_signals: [
      "Name partial match ('Maria Santos')",
      "Nationality match (Mexico)",
      "Alias 'Maria S. Rodriguez' closely matches customer full name",
    ],
    conflicting_signals: [
      "DOB 2-year discrepancy (1985 vs 1983)",
      "'Maria Santos' is a common Hispanic name",
      "Limited public corroboration linking customer to drug trafficking",
    ],
    customer_background:
      "Online research for Maria Santos Rodriguez (Mexico, born 1985) returns limited results with no direct link to drug trafficking or sanctioned activity. The name is common in Mexico and Latin America.",
    sanctions_background:
      "EU designated 'Maria Santos' in March 2024 for involvement in drug trafficking networks across Central America. DEA reports from 2024 reference this individual in connection with cartel logistics operations. Born 1983-12-18 in Guadalajara, Mexico.",
    sources: [
      { label: "EU Sanctions List — Council Regulation", url: "https://ec.europa.eu/sanctions" },
      {
        label: "DEA Report — Central American drug networks",
        url: "https://dea.gov/reports/central-america-2024",
      },
    ],
    processed_at: "2026-03-27T08:10:00Z",
  },
  {
    result_id: "L2-005",
    flag_id: "FLAG-005",
    customer_id: "AAAAAAAAEKKAAAAA",
    entity_id: "OFAC-99999",
    ai_confidence: 72,
    // layer1_norm=(120/120*100)=100 → combined=(100*0.3)+(72*0.7)=30+50.4=80
    combined_score: 80,
    routing: "HUMAN_REVIEW",
    reasoning:
      "Step 1 — Customer profile: Online research for Chen Wei (China, born 1972) yields limited results. 'Chen Wei' is one of the most common Chinese names. No direct link to technology transfer, weapons programs, or OFAC-designated activity found in publicly available sources. Step 2 — Sanctions entity profile: OFAC designated 'Chen Wei Lin' in September 2024 for facilitating technology transfer to entities supporting advanced weapons programs. South China Morning Post and Nikkei Asia reported on the designation. The entity operates out of Shenzhen. Step 3 — Cross-comparison: Customer name 'Chen Wei' is an exact match for the alias 'Chen Wei' listed on the sanctions record. The primary designation name is 'Chen Wei Lin' — the customer name appears to be a subset. Exact DOB match (1972-01-28). Nationality matches (China). The alias exact match combined with the exact DOB match is highly significant. However, 'Chen Wei' is an extremely common Chinese name (estimated 300,000+ individuals in China). Step 4 — Assessment: High-moderate confidence. The exact DOB and alias match are strong signals, but the name commonality is a significant mitigating factor. Layer 1 composite score is very high (120). Human review should verify occupation and business dealings against the technology sector red flags in the OFAC designation.",
    matching_signals: [
      "Alias 'Chen Wei' exact match",
      "DOB exact match (1972-01-28)",
      "Nationality match (China)",
      "Layer 1 composite score very high (120/120)",
    ],
    conflicting_signals: [
      "'Chen Wei' is an extremely common Chinese name (~300k+ individuals)",
      "Customer occupation/sector not yet verified against technology transfer risk",
    ],
    customer_background:
      "Online research for Chen Wei (China, born 1972) yields limited distinguishing results due to the name's extreme commonality in China. No direct evidence found linking this specific individual to technology transfer or weapons programs.",
    sanctions_background:
      "OFAC designated Chen Wei Lin (alias: Chen Wei) in September 2024 for facilitating technology transfer to entities involved in advanced weapons programs. The entity is based in Shenzhen and operates in the technology sector. SCMP and Nikkei Asia reported on the designation.",
    sources: [
      {
        label: "OFAC SDN Designation — Sep 2024",
        url: "https://ofac.treasury.gov/recent-actions/20240915",
      },
      {
        label: "SCMP — US sanctions Chinese tech facilitators",
        url: "https://scmp.com/tech/us-sanctions-china-2024",
      },
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
