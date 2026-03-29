// Mock data generator — 10,000 customers + sanctions watchlist
// Runtime state is mutable: Layer 1 flags, Layer 2 results, and queue
// are populated dynamically during the activation flow.

import type {
  Customer,
  SanctionsEntry,
  Layer1Flag,
  Layer2Result,
  QueueItem,
  Decision,
  AuditEntry,
  RoutingDecision,
} from "@/types/screening";

// ── Name pools (100 first × 100 last = 10,000 unique customers) ────

const FIRST_NAMES = [
  "Ahmad",
  "Viktor",
  "John",
  "Maria",
  "Chen",
  "Fatima",
  "Dmitri",
  "Sarah",
  "Mohammed",
  "Elena",
  "James",
  "Yuki",
  "Carlos",
  "Priya",
  "Olga",
  "David",
  "Mei",
  "Hassan",
  "Sofia",
  "Ivan",
  "Michael",
  "Aisha",
  "Sergei",
  "Anna",
  "Wei",
  "Robert",
  "Noor",
  "Alexei",
  "Isabella",
  "Hiroshi",
  "William",
  "Layla",
  "Andrei",
  "Emma",
  "Takeshi",
  "Thomas",
  "Amina",
  "Nikolai",
  "Lucia",
  "Kenji",
  "Daniel",
  "Zara",
  "Boris",
  "Valentina",
  "Ryu",
  "Patrick",
  "Fatou",
  "Oleg",
  "Camila",
  "Jin",
  "Benjamin",
  "Mariam",
  "Vladislav",
  "Rosa",
  "Tao",
  "Christopher",
  "Halima",
  "Yevgeny",
  "Laura",
  "Koji",
  "Andrew",
  "Samira",
  "Maxim",
  "Clara",
  "Hideo",
  "George",
  "Leila",
  "Pavel",
  "Gabriela",
  "Masato",
  "Richard",
  "Nasreen",
  "Kirill",
  "Diana",
  "Shun",
  "Stephen",
  "Khadija",
  "Artem",
  "Teresa",
  "Haruki",
  "Edward",
  "Salma",
  "Grigory",
  "Carmen",
  "Daichi",
  "Henry",
  "Maryam",
  "Timur",
  "Pilar",
  "Ren",
  "Joseph",
  "Yasmin",
  "Roman",
  "Adriana",
  "Sho",
  "Kenneth",
  "Safiya",
  "Stanislav",
  "Alicia",
  "Akira",
];

const LAST_NAMES = [
  "Al-Hassan",
  "Petrov",
  "Smith",
  "Santos",
  "Wei",
  "Okafor",
  "Kumar",
  "Nakamura",
  "Mueller",
  "Johansson",
  "Kim",
  "Nowak",
  "Silva",
  "Ivanov",
  "Zhang",
  "Nguyen",
  "Kowalski",
  "Fernandez",
  "Volkov",
  "Tanaka",
  "Brown",
  "El-Sayed",
  "Sharma",
  "Yamamoto",
  "Fischer",
  "Eriksson",
  "Park",
  "Wisniewski",
  "Garcia",
  "Kozlov",
  "Johnson",
  "Al-Rashid",
  "Gupta",
  "Watanabe",
  "Schmidt",
  "Lindberg",
  "Lee",
  "Kaczmarek",
  "Rodriguez",
  "Morozov",
  "Williams",
  "Hassan",
  "Singh",
  "Suzuki",
  "Weber",
  "Nilsson",
  "Choi",
  "Lewandowski",
  "Martinez",
  "Kuznetsov",
  "Davis",
  "Ibrahim",
  "Patel",
  "Takahashi",
  "Bauer",
  "Andersen",
  "Yang",
  "Wojcik",
  "Lopez",
  "Popov",
  "Wilson",
  "Khalil",
  "Desai",
  "Ito",
  "Schneider",
  "Larsson",
  "Li",
  "Kaminski",
  "Hernandez",
  "Sokolov",
  "Taylor",
  "Nasser",
  "Rao",
  "Sato",
  "Hoffman",
  "Olsson",
  "Wu",
  "Szymanski",
  "Gonzalez",
  "Lebedev",
  "Anderson",
  "Saleh",
  "Joshi",
  "Kobayashi",
  "Wagner",
  "Persson",
  "Xu",
  "Dabrowski",
  "Perez",
  "Novikov",
  "Jackson",
  "Mahmoud",
  "Chatterjee",
  "Kato",
  "Richter",
  "Svensson",
  "Huang",
  "Zielinski",
  "Ramirez",
  "Orlov",
];

const NATIONALITIES = [
  "UNITED STATES",
  "UNITED KINGDOM",
  "CANADA",
  "GERMANY",
  "FRANCE",
  "JAPAN",
  "CHINA",
  "INDIA",
  "BRAZIL",
  "MEXICO",
  "RUSSIA",
  "SOUTH KOREA",
  "AUSTRALIA",
  "ITALY",
  "SPAIN",
  "NETHERLANDS",
  "SWEDEN",
  "NORWAY",
  "POLAND",
  "TURKEY",
  "EGYPT",
  "NIGERIA",
  "SOUTH AFRICA",
  "KENYA",
  "LEBANON",
  "SYRIA",
  "IRAQ",
  "IRAN",
  "PAKISTAN",
  "BANGLADESH",
  "INDONESIA",
  "THAILAND",
  "VIETNAM",
  "PHILIPPINES",
  "COLOMBIA",
  "ARGENTINA",
  "CHILE",
  "PERU",
  "SINGAPORE",
  "MALAYSIA",
];

// ── Suspicious customer overrides (names matching sanctions entries) ─

interface SuspiciousOverride {
  index: number;
  full_name: string;
  nationality: string;
  dob: string;
}

const SUSPICIOUS_CUSTOMERS: SuspiciousOverride[] = [
  // Matches "Ahmad Al-Hassan" (OFAC-12345, Lebanon, 1976-05-20)
  { index: 42, full_name: "Ahmad Hassan", nationality: "LEBANON", dob: "1978-03-15" },
  { index: 315, full_name: "Ahmad Al-Hasan", nationality: "LEBANON", dob: "1976-05-20" },
  { index: 1204, full_name: "Ahmed Al-Hassan", nationality: "SYRIA", dob: "1980-11-02" },
  { index: 4801, full_name: "Ahmad Hassan Ali", nationality: "IRAQ", dob: "1975-08-10" },
  { index: 7632, full_name: "Ahmed Hassan", nationality: "EGYPT", dob: "1982-01-22" },
  // Matches "Viktor Sergeyevich Petrov" (OFAC-67890, Russia, 1965-11-22)
  { index: 1337, full_name: "Viktor Petrov", nationality: "RUSSIA", dob: "1965-11-22" },
  { index: 2891, full_name: "Viktor S. Petrov", nationality: "RUSSIA", dob: "1966-03-14" },
  { index: 5044, full_name: "Viktor Petrovitch", nationality: "BELARUS", dob: "1968-07-09" },
  { index: 8210, full_name: "Viktoria Petrova", nationality: "RUSSIA", dob: "1970-04-18" },
  // Matches "John Michael Smith" (UN-54321, UK, 1970-02-14)
  { index: 500, full_name: "John Smith", nationality: "UNITED STATES", dob: "1990-06-10" },
  { index: 3621, full_name: "Jon Smith", nationality: "UNITED KINGDOM", dob: "1971-02-14" },
  { index: 6107, full_name: "John M. Smith", nationality: "UNITED KINGDOM", dob: "1969-09-30" },
  // Matches "Maria Santos" (EU-11111, Mexico, 1983-12-18)
  { index: 888, full_name: "Maria Santos Rodriguez", nationality: "MEXICO", dob: "1985-09-03" },
  { index: 2100, full_name: "Maria Santos", nationality: "COLOMBIA", dob: "1983-12-18" },
  { index: 6500, full_name: "Maria Santos Lopez", nationality: "MEXICO", dob: "1987-06-25" },
  // Matches "Chen Wei Lin" (OFAC-99999, China, 1972-01-28)
  { index: 1750, full_name: "Chen Wei", nationality: "CHINA", dob: "1972-01-28" },
  { index: 4200, full_name: "Chen Wei Lin", nationality: "TAIWAN", dob: "1973-05-11" },
  { index: 9001, full_name: "Chen Weilin", nationality: "CHINA", dob: "1972-01-28" },
  { index: 9500, full_name: "Chen Wei Zhang", nationality: "CHINA", dob: "1975-10-04" },
];

// Seeded PRNG for deterministic customer generation
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// ── Customer generator (10,000 customers) ───────────────────────────

let _customers: Customer[] | null = null;

function generateCustomers(): Customer[] {
  const customers: Customer[] = [];
  const rand = seededRandom(12345);
  const suspiciousMap = new Map(SUSPICIOUS_CUSTOMERS.map((s) => [s.index, s]));

  for (let i = 0; i < 10000; i++) {
    const override = suspiciousMap.get(i);

    if (override) {
      customers.push({
        customer_id: `CUST-${String(i).padStart(5, "0")}`,
        full_name: override.full_name,
        dob: override.dob,
        nationality: override.nationality,
        email: `${override.full_name.toLowerCase().replace(/[\s.]+/g, ".")}@example.com`,
        entity_type: "INDIVIDUAL",
        created_at: "2026-03-29T08:00:00Z",
      });
    } else {
      const firstName = FIRST_NAMES[i % 100];
      const lastName = LAST_NAMES[Math.floor(i / 100)];
      const nat = NATIONALITIES[Math.floor(rand() * NATIONALITIES.length)];
      const year = 1955 + Math.floor(rand() * 50);
      const month = 1 + Math.floor(rand() * 12);
      const day = 1 + Math.floor(rand() * 28);
      const dob = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      customers.push({
        customer_id: `CUST-${String(i).padStart(5, "0")}`,
        full_name: `${firstName} ${lastName}`,
        dob,
        nationality: nat,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/[^a-z]/g, "")}@example.com`,
        entity_type: "INDIVIDUAL",
        created_at: "2026-03-29T08:00:00Z",
      });
    }
  }

  return customers;
}

export function getCustomers(): Customer[] {
  if (!_customers) _customers = generateCustomers();
  return _customers;
}

// ── Sanctions / Watchlist (static) ──────────────────────────────────

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
      "Designated pursuant to E.O. 14024 for operating in the financial services sector of the Russian Federation economy.",
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

// ── Mutable runtime state ───────────────────────────────────────────

export const runtime = {
  layer1Flags: [] as Layer1Flag[],
  layer2Results: [] as Layer2Result[],
  reviewQueue: [] as QueueItem[],
  decisions: [] as Decision[],
  auditLog: [] as AuditEntry[],
  activated: false,
};

export function resetRuntime() {
  runtime.layer1Flags = [];
  runtime.layer2Results = [];
  runtime.reviewQueue = [];
  runtime.decisions = [];
  runtime.auditLog = [];
  runtime.activated = false;
}

// ── Layer 2 result generator ────────────────────────────────────────

export function generateLayer2Result(
  flag: Layer1Flag,
  customer: Customer,
  sanction: SanctionsEntry
): Layer2Result {
  // Determine AI confidence from flag quality
  const normalizedL1 = Math.min(100, (flag.composite_score / 120) * 100);
  let aiConfidence: number;

  if (flag.composite_score >= 110) {
    aiConfidence = 85 + Math.floor((flag.name_score * 10) % 10);
  } else if (flag.composite_score >= 80) {
    aiConfidence = 45 + Math.floor((flag.name_score * 100) % 25);
  } else if (flag.composite_score >= 65) {
    aiConfidence = 25 + Math.floor((flag.name_score * 100) % 20);
  } else {
    aiConfidence = 5 + Math.floor((flag.name_score * 100) % 15);
  }

  const combinedScore = Math.round(normalizedL1 * 0.3 + aiConfidence * 0.7);
  let routing: RoutingDecision;
  if (combinedScore >= 85) routing = "AUTO_RESTRICT";
  else if (combinedScore <= 20) routing = "AUTO_CLEAR";
  else routing = "HUMAN_REVIEW";

  const matchingSignals: string[] = [];
  const conflictingSignals: string[] = [];

  if (flag.name_score >= 0.9)
    matchingSignals.push(`Name high similarity (Jaro-Winkler ${flag.name_score.toFixed(2)})`);
  else if (flag.name_score >= 0.82)
    matchingSignals.push(`Name partial match (Jaro-Winkler ${flag.name_score.toFixed(2)})`);
  if (flag.dob_score >= 30) matchingSignals.push("DOB exact match");
  else if (flag.dob_score >= 15) matchingSignals.push("DOB within 1 year");
  if (flag.nationality_score >= 20)
    matchingSignals.push(`Nationality match (${customer.nationality})`);

  if (flag.dob_score === 0) conflictingSignals.push("DOB does not match");
  if (flag.nationality_score < 0)
    conflictingSignals.push(
      `Nationality mismatch (${customer.nationality} vs ${sanction.nationality_country})`
    );
  if (flag.name_score < 0.9 && flag.name_score >= 0.82)
    conflictingSignals.push("Name match is partial, not exact");

  const reasoning =
    `Step 1 — Customer profile: ${customer.full_name} (${customer.nationality}, ${customer.dob}). ` +
    `Step 2 — Sanctions entity profile: ${sanction.entity_name} (${sanction.authority} ${sanction.list_name}), designated ${sanction.effective_date}. ${sanction.entity_notes} ` +
    `Step 3 — Cross-comparison: Name similarity ${flag.name_score.toFixed(2)}, DOB score ${flag.dob_score}, nationality score ${flag.nationality_score}. ` +
    `${matchingSignals.length > 0 ? "Matching signals: " + matchingSignals.join("; ") + ". " : ""}` +
    `${conflictingSignals.length > 0 ? "Conflicting signals: " + conflictingSignals.join("; ") + ". " : ""}` +
    `Step 4 — Assessment: Combined score ${combinedScore}%. Routing: ${routing}.`;

  return {
    result_id: `L2-${flag.flag_id}`,
    flag_id: flag.flag_id,
    customer_id: flag.customer_id,
    entity_id: flag.entity_id,
    ai_confidence: aiConfidence,
    combined_score: combinedScore,
    routing,
    reasoning,
    matching_signals: matchingSignals,
    conflicting_signals: conflictingSignals,
    customer_background: `Online research for ${customer.full_name} (${customer.nationality}, born ${customer.dob}).`,
    sanctions_background: `${sanction.authority} designated ${sanction.entity_name} (${sanction.effective_date}). ${sanction.entity_notes}`,
    sources: [{ label: `${sanction.authority} Designation Notice`, url: sanction.citation_link }],
    processed_at: new Date().toISOString(),
  };
}

// ── Lookup helpers ──────────────────────────────────────────────────

export function findCustomer(id: string) {
  return getCustomers().find((c) => c.customer_id === id);
}
export function findSanctionsEntry(id: string) {
  return MOCK_SANCTIONS.find((s) => s.entity_id === id);
}
export function findLayer1Flag(flagId: string) {
  return runtime.layer1Flags.find((f) => f.flag_id === flagId);
}
export function findLayer2Result(resultId: string) {
  return runtime.layer2Results.find((r) => r.result_id === resultId);
}
export function findQueueItem(queueId: string) {
  return runtime.reviewQueue.find((q) => q.queue_id === queueId);
}
export function findLayer2ByCustomer(customerId: string) {
  return runtime.layer2Results.find((r) => r.customer_id === customerId);
}
export function findLayer1ByCustomer(customerId: string) {
  return runtime.layer1Flags.find((f) => f.customer_id === customerId);
}
