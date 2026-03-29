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
  Source,
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

const gc = globalThis as unknown as { __screeningCustomers?: Customer[] | null };
if (gc.__screeningCustomers === undefined) gc.__screeningCustomers = null;

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
  if (!gc.__screeningCustomers) gc.__screeningCustomers = generateCustomers();
  return gc.__screeningCustomers;
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
    nationality_country: "LEBANON",
    citizenship_country: "LEBANON",
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
    nationality_country: "RUSSIA",
    citizenship_country: "RUSSIA",
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
    nationality_country: "UNITED KINGDOM",
    citizenship_country: "UNITED KINGDOM",
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
    nationality_country: "MEXICO",
    citizenship_country: "MEXICO",
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
    nationality_country: "CHINA",
    citizenship_country: "CHINA",
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
// Use globalThis to persist state across Next.js dev-mode module re-evaluations.
// Without this, each API route gets its own copy of `runtime` and state set by
// one route (e.g. /run) is invisible to another (e.g. /layer2-process-one).

export type ActivationStage = "idle" | "server" | "layer1" | "layer2" | "active";

interface RuntimeState {
  layer1Flags: Layer1Flag[];
  layer2Results: Layer2Result[];
  reviewQueue: QueueItem[];
  decisions: Decision[];
  auditLog: AuditEntry[];
  activated: boolean;
  stage: ActivationStage;
  layer2Done: number;
  layer2Total: number;
}

const g = globalThis as unknown as { __screeningRuntime?: RuntimeState };
if (!g.__screeningRuntime) {
  g.__screeningRuntime = {
    layer1Flags: [],
    layer2Results: [],
    reviewQueue: [],
    decisions: [],
    auditLog: [],
    activated: false,
    stage: "idle" as ActivationStage,
    layer2Done: 0,
    layer2Total: 0,
  };
}
export const runtime: RuntimeState = g.__screeningRuntime;

export function resetRuntime() {
  runtime.layer1Flags = [];
  runtime.layer2Results = [];
  runtime.reviewQueue = [];
  runtime.decisions = [];
  runtime.auditLog = [];
  runtime.activated = false;
  runtime.stage = "idle";
  runtime.layer2Done = 0;
  runtime.layer2Total = 0;
}

// ── Human-readable reasoning builder ───────────────────────────────

// Per-entity research context used to generate 3-paragraph AI reasoning:
// Paragraph 1: Why this could be the same person
// Paragraph 2: Why this is likely not the same person
// Paragraph 3: Recommendation for the reviewer
const ENTITY_RESEARCH: Record<
  string,
  {
    /** Paragraph arguing why the customer could be the sanctioned individual */
    couldBeTemplate: string;
    /** Paragraph arguing why the customer is likely not the sanctioned individual */
    couldNotBeTemplate: string;
    /** Paragraph with assessment and recommended next steps */
    assessmentTemplate: string;
    customerContextTemplate: string;
    sanctionsContext: string;
    sources: Source[];
  }
> = {
  "OFAC-12345": {
    couldBeTemplate:
      'There are credible reasons to investigate whether {customerName} could be the sanctioned Ahmad Al-Hassan. The customer\'s name is a close variant of the OFAC-listed individual "Ahmad Al-Hassan," who was designated on the SDN List on January 15, 2023 for providing financial facilitation services to sanctioned entities in the Middle East (Source: OFAC Recent Actions, treasury.gov). The designated person\'s known aliases — including "Ahmad Hassan," "Ahmed Al Hassan," and "Abu Ahmad" — demonstrate that transliteration variants are officially documented, meaning the customer\'s name could represent yet another romanization of the same Arabic name أحمد الحسن. Additionally, the designated individual was born in Tripoli, Lebanon and has operated as a financial intermediary across multiple Middle Eastern jurisdictions, and any geographic or financial connection the customer may have to the broader region could indicate relevance (Source: UN Security Council Consolidated List).',
    couldNotBeTemplate:
      "However, several factors strongly suggest this is not the same person. The customer is a {customerNationality} national born on {customerDob}, while the sanctioned Ahmad Al-Hassan is a Lebanese citizen born on May 20, 1976 in Tripoli — a {dobDiff}-year age gap and different nationality substantially reduce the likelihood of a true match (Source: OFAC SDN Entry OFAC-12345). Critically, \"Ahmad Al-Hassan\" and its variants are among the most common Arabic names across the Middle East and North Africa. Research from the UK Office for National Statistics shows thousands of individuals sharing this name reside in the UK alone, and globally the name appears in census records across Lebanon, Syria, Egypt, Iraq, Jordan, and the Palestinian territories, making coincidental matches statistically highly probable (Source: ONS, ons.gov.uk). Furthermore, public records searches through Companies House and OpenCorporates show no financial or business connections between the customer's profile and the sanctioned individual's known network of shell companies operating out of Beirut.",
    assessmentTemplate:
      "On balance, the name similarity warrants a flag but the weight of evidence — including the {dobDiff}-year DOB discrepancy, nationality mismatch, and the extremely high frequency of this name in Arabic-speaking populations — points toward a false positive. The reviewer should request the customer's passport copy to verify the full legal name and any patronymic identifiers, and cross-reference transaction history for any connections to Lebanon or the entities named in the OFAC designation. If no corroborating indicators emerge, this case can be cleared with a documented rationale. Combined assessment score: {combinedScore}%.",
    customerContextTemplate:
      "Public records indicate {customerName} is a {customerNationality} resident with no known ties to Lebanon or sanctioned financial networks. The name is extremely common in Arabic-speaking communities worldwide, appearing in UK census data as one of the top 200 surnames of Arabic origin (Source: ONS, ons.gov.uk).",
    sanctionsContext:
      'Ahmad Al-Hassan (OFAC-12345) was designated on January 15, 2023 under the SDN List for facilitating financial transfers to designated entities in the Middle East. He is a Lebanese national born May 20, 1976 in Tripoli, with known addresses in Beirut. Known aliases include "Ahmad Hassan," "Ahmed Al Hassan," and "Abu Ahmad" (Source: OFAC Recent Actions, treasury.gov).',
    sources: [
      {
        label: "OFAC SDN List — Ahmad Al-Hassan Designation",
        url: "https://ofac.treasury.gov/recent-actions/20230115",
      },
      {
        label: "UK Office for National Statistics — Name Frequency Data",
        url: "https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages",
      },
      {
        label: "UN Security Council Consolidated List",
        url: "https://www.un.org/securitycouncil/sanctions/consolidated-list",
      },
    ],
  },
  "OFAC-67890": {
    couldBeTemplate:
      'There are indicators that {customerName} could potentially be the sanctioned Viktor Sergeyevich Petrov. The customer\'s name closely matches the OFAC-designated individual, who was placed on the SDN List on June 10, 2022 pursuant to Executive Order 14024 for operating in the Russian financial services sector (Source: OFAC Recent Actions, treasury.gov). The sanctioned individual is documented as using shortened name variants including "Viktor Petrov" and the Cyrillic form "Виктор Петров," both of which are consistent with the customer\'s name on file. Investigative reporting by The Guardian and Novaya Gazeta linked the designated Petrov to a network of Moscow-based financial firms that facilitated capital flows for sanctioned Russian state enterprises following the 2022 invasion of Ukraine (Source: EU Council Decision 2022/1530). Both the customer and the sanctioned person share ties to Russia, and the sanctioned Petrov is known to have held accounts at multiple international financial institutions before his designation.',
    couldNotBeTemplate:
      'Significant evidence suggests these are different individuals. The customer was born on {customerDob} while the designated Viktor Petrov was born on November 22, 1965 in Saint Petersburg — the {dobDiff}-year discrepancy is a meaningful biographical difference that cannot easily be attributed to clerical error in Russian civil registry systems, which are generally well-maintained for this era (Source: OFAC SDN Entry OFAC-67890). Additionally, "Viktor Petrov" is one of the most common Russian male name combinations, comparable to "John Smith" in English — Petrov is Russia\'s fourth most common surname (approximately 1.3 million bearers), and the Russian Federal Statistics Service records tens of thousands of individuals with this exact first-last combination (Source: Rosstat, rosstat.gov.ru). The sanctioned individual held senior positions in Russian state-linked financial institutions and was based in Moscow, while the customer\'s profile shows no corporate directorships, state-enterprise connections, or activity in the financial services sector.',
    assessmentTemplate:
      'The name match creates a screening obligation, but the {dobDiff}-year DOB gap, the extraordinary frequency of "Viktor Petrov" in the Russian population, and the absence of any financial-sector or state-enterprise connections in the customer\'s profile collectively suggest a false positive. The reviewer should verify the customer\'s full legal name including patronymic — if it is "Sergeyevich," the case should be escalated regardless of other differences. Otherwise, confirm no transaction patterns link to the entities in the OFAC designation and clear with documented rationale. Combined assessment score: {combinedScore}%.',
    customerContextTemplate:
      'Public records indicate {customerName} is a {customerNationality} national. "Viktor Petrov" is an extremely common Russian name, ranking among the top 50 most frequent full-name combinations according to Russian census data (Source: Rosstat, rosstat.gov.ru). No corporate links to Russian state entities were identified.',
    sanctionsContext:
      'Viktor Sergeyevich Petrov (OFAC-67890) was designated on June 10, 2022 under E.O. 14024 for operating in the financial services sector of the Russian Federation. Born November 22, 1965 in Saint Petersburg, he held senior positions at multiple Russian financial institutions. Known aliases: "Viktor Petrov," "V. Petrov," "Виктор Петров" (Source: OFAC Recent Actions, treasury.gov; EU Council Decision 2022/1530).',
    sources: [
      {
        label: "OFAC SDN List — Viktor Petrov Designation",
        url: "https://ofac.treasury.gov/recent-actions/20220610",
      },
      {
        label: "EU Sanctions Map — Russia Designations",
        url: "https://www.sanctionsmap.eu/#/main",
      },
      { label: "Rosstat — Russian Name Frequency Statistics", url: "https://rosstat.gov.ru" },
    ],
  },
  "UN-54321": {
    couldBeTemplate:
      'There are surface-level indicators that {customerName} could be connected to the sanctioned John Michael Smith. The customer\'s name is a close variant of the individual listed on the UN Security Council Consolidated List since August 22, 2019 for involvement in proliferation financing activities (Source: UN Security Council Sanctions List, un.org). The sanctioned individual is known to use the shortened alias "J. Smith," which could correspond to many common name presentations in banking records. BBC and Financial Times reporting from 2019 noted that the designated Smith operated as a financial intermediary arranging financing for dual-use technology transfers through UK-registered shell companies, and the customer shares a connection to the United Kingdom, where the designated John Michael Smith was last known to reside in London (Source: UN SC Consolidated List; HM Treasury Sanctions List).',
    couldNotBeTemplate:
      "The evidence against this being the same person is substantial. \"John Smith\" is the single most common full name in the English-speaking world — the UK's Office for National Statistics estimates over 36,000 individuals named John Smith currently reside in England and Wales alone, and the U.S. Social Security Administration records tens of thousands more, making false positives from sanctions screening systems statistically near-certain for this name (Source: ONS, ons.gov.uk). The customer was born on {customerDob} while the designated individual was born February 14, 1970 — the {dobDiff}-year age difference is a strong indicator of distinct identities (Source: UN SC Entry UN-54321). Furthermore, the sanctioned John Michael Smith was specifically linked to proliferation financing networks operating in Southeast Asia, with the UN Panel of Experts report S/2019/691 detailing shell company structures in London's financial district used to channel payments. No geographic, financial, or professional connections link this customer to those activities.",
    assessmentTemplate:
      'Given the extreme frequency of the name "John Smith," the {dobDiff}-year DOB discrepancy, and the absence of any proliferation-finance indicators in the customer\'s profile, this is very likely a false positive. The reviewer should verify the customer\'s full legal name (specifically whether a middle name "Michael" is present), confirm the DOB against identity documents, and check for any connections to the UK financial sector or Southeast Asian transactions. If none corroborate, this case should be cleared. Combined assessment score: {combinedScore}%.',
    customerContextTemplate:
      'Public records show {customerName} is a {customerNationality} national. The name "John Smith" is the most common male full name in the English-speaking world, with over 36,000 bearers in England and Wales per ONS data (Source: ons.gov.uk). No links to proliferation financing networks were identified.',
    sanctionsContext:
      'John Michael Smith (UN-54321) was listed by the UN Security Council on August 22, 2019 for involvement in proliferation financing. He is a UK national born February 14, 1970 in London. The designation relates to financing networks facilitating weapons proliferation in Southeast Asia. Known alias: "J. Smith" (Source: UN SC Consolidated List, un.org; UN Panel of Experts Report S/2019/691).',
    sources: [
      {
        label: "UN Security Council Consolidated List — John Michael Smith",
        url: "https://www.un.org/securitycouncil/sanctions/list",
      },
      {
        label: "HM Treasury — UK Financial Sanctions List",
        url: "https://www.gov.uk/government/publications/financial-sanctions-consolidated-list-of-targets",
      },
      {
        label: "UK Office for National Statistics — Name Frequency",
        url: "https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages",
      },
    ],
  },
  "EU-11111": {
    couldBeTemplate:
      'There are reasons to investigate whether {customerName} could be the sanctioned Maria Santos. The customer\'s name closely matches the individual listed on the EU Sanctions List since March 1, 2024 for involvement in drug trafficking networks operating across Central America (Source: EU Restrictive Measures, ec.europa.eu). Known aliases for the sanctioned person include "M. Santos" and "Maria S. Rodriguez," both of which reflect common Latin American naming conventions involving maternal and paternal surnames, meaning the customer could be using a shortened form of a longer legal name. Europol\'s public threat assessment linked the designated Santos to a cartel logistics operation responsible for coordinating shipments through Central American transit corridors into Europe, and El País and EFE reported that the designation followed a joint EU-Mexican investigation resulting in asset freezes across multiple EU member states (Source: EU Council Regulation 2024/0301).',
    couldNotBeTemplate:
      "However, the evidence against identification is compelling. \"Maria Santos\" is one of the most common female names in the Spanish and Portuguese-speaking world — Brazil alone records over 120,000 individuals with this exact name according to IBGE census data, and it is similarly prevalent across Mexico, Colombia, the Philippines, and other countries, making coincidental screening matches statistically almost inevitable (Source: IBGE, ibge.gov.br). The customer was born on {customerDob} while the designated Maria Santos was born December 18, 1983 in Guadalajara, Mexico — the {dobDiff}-year age gap and distinct birthplaces suggest these are different people (Source: EU Sanctions Entry EU-11111). The sanctioned individual's drug trafficking network operated specifically in the Mexico-Guatemala-Honduras corridor according to the UNODC World Drug Report 2024 and Europol's SOCTA 2024 assessment, and no law enforcement records or open-source intelligence links this customer to those geographic regions or criminal activities.",
    assessmentTemplate:
      'The name "Maria Santos" generates an exceptionally high false-positive rate in sanctions screening due to its frequency across Latin America. Combined with the {dobDiff}-year DOB gap and absence of any connections to Central American drug trafficking corridors, this is most likely a coincidental match. The reviewer should verify the customer\'s full legal name (including any maternal surname), confirm DOB and place of birth against identity documents, and check transaction history for any Central American nexus. If no corroborating evidence emerges, this case should be cleared. Combined assessment score: {combinedScore}%.',
    customerContextTemplate:
      'Public records indicate {customerName} is a {customerNationality} national. "Maria Santos" is among the most common female names in Latin America, with over 120,000 registered bearers in Brazil alone (Source: IBGE, ibge.gov.br). No links to organized crime or drug trafficking were identified.',
    sanctionsContext:
      'Maria Santos (EU-11111) was listed on March 1, 2024 by the EU for involvement in drug trafficking networks in Central America. She is a Mexican national born December 18, 1983 in Guadalajara. Known aliases: "M. Santos," "Maria S. Rodriguez." The designation relates to narcotics logistics across the Mexico-Guatemala-Honduras corridor (Source: EU Restrictive Measures, ec.europa.eu; UNODC World Drug Report 2024).',
    sources: [
      { label: "EU Restrictive Measures — Maria Santos", url: "https://ec.europa.eu/sanctions" },
      {
        label: "UNODC World Drug Report 2024",
        url: "https://www.unodc.org/unodc/en/data-and-analysis/world-drug-report-2024.html",
      },
      {
        label: "IBGE — Brazilian Name Census Data",
        url: "https://censo2022.ibge.gov.br/panorama/",
      },
    ],
  },
  "OFAC-99999": {
    couldBeTemplate:
      'There are indicators that {customerName} could be linked to the sanctioned Chen Wei Lin. The customer\'s name closely matches the individual designated on the OFAC SDN List on September 15, 2024 for facilitating technology transfer to entities supporting advanced weapons programs (Source: OFAC Recent Actions, treasury.gov). The sanctioned individual is documented as operating under shortened names including "Chen Wei" and "C.W. Lin," which are consistent with standard Chinese naming conventions where given names may be written with or without spaces between syllables. Both the customer and sanctioned individual are linked to China, and the designated Chen Wei Lin operated out of Shenzhen — a major technology hub in the Pearl River Delta where cross-border technology transfers and semiconductor procurement frequently occur. The South China Morning Post and CSIS identified Chen as a mid-level broker arranging procurement of controlled semiconductor equipment through intermediary companies (Source: Bureau of Industry and Security Entity List, bis.doc.gov).',
    couldNotBeTemplate:
      "Strong evidence suggests these are different individuals. \"Chen Wei\" is one of the most common name combinations in China — the Ministry of Public Security's 2023 national name report estimates over 300,000 individuals share this exact given-name and surname pairing in mainland China alone, making it statistically one of the highest-frequency names in the world (Source: China MPS National Name Report 2023). The customer was born on {customerDob} while the sanctioned Chen Wei Lin was born January 28, 1972 in Shanghai — the {dobDiff}-year age difference and distinct biographical backgrounds suggest different people (Source: OFAC SDN Entry OFAC-99999). Furthermore, the sanctioned individual was specifically linked to advanced weapons program procurement networks operating between Shenzhen and entities in North Korea and Iran according to the UN Panel of Experts report S/2024/312, and the customer's profile shows no ties to the defense sector, technology transfer activities, or the specific Pearl River Delta procurement networks described in the BIS Entity List.",
    assessmentTemplate:
      "The extreme frequency of \"Chen Wei\" in the Chinese population, combined with the {dobDiff}-year DOB discrepancy and absence of any technology-transfer or defense-sector connections, strongly suggests a false positive. The reviewer should verify the customer's full legal name in Chinese characters (陈伟 vs. 陈威 vs. other homophone variations), confirm DOB against identity documents, and check whether the customer has any business connections to Shenzhen's technology corridor or the entities named in the OFAC designation. If no additional corroborating indicators emerge, this case can be cleared. Combined assessment score: {combinedScore}%.",
    customerContextTemplate:
      'Public records indicate {customerName} is a {customerNationality} national. "Chen Wei" is among the most common name combinations in China, with over 300,000 bearers according to the Ministry of Public Security\u2019s 2023 name report (Source: China MPS). No links to technology transfer or weapons procurement networks were identified.',
    sanctionsContext:
      'Chen Wei Lin (OFAC-99999) was designated on September 15, 2024 for facilitating technology transfers supporting advanced weapons programs. Born January 28, 1972 in Shanghai, he operated out of Shenzhen. Known aliases: "Chen Wei," "C.W. Lin." The designation connects to procurement networks linked to North Korea and Iran (Source: OFAC Recent Actions, treasury.gov; BIS Entity List, bis.doc.gov).',
    sources: [
      {
        label: "OFAC SDN List — Chen Wei Lin Designation",
        url: "https://ofac.treasury.gov/recent-actions/20240915",
      },
      {
        label: "BIS Entity List",
        url: "https://www.bis.doc.gov/index.php/policy-guidance/lists-of-parties-of-concern/entity-list",
      },
      { label: "China MPS National Name Report 2023", url: "https://www.mps.gov.cn" },
    ],
  },
};

function buildHumanReadableReasoning(
  customer: Customer,
  sanction: SanctionsEntry,
  flag: Layer1Flag,
  _matchingSignals: string[],
  _conflictingSignals: string[],
  combinedScore: number,
  _routing: RoutingDecision
): {
  reasoning: string;
  customerBackground: string;
  sanctionsBackground: string;
  sources: Source[];
} {
  const research = ENTITY_RESEARCH[sanction.entity_id];

  // Fallback for unknown entities
  if (!research) {
    const reasoning =
      `There are indicators that "${customer.full_name}" could be the sanctioned "${sanction.entity_name}." The name similarity score is ${flag.name_score.toFixed(2)} (Jaro-Winkler), suggesting a ${flag.name_score >= 0.9 ? "strong" : "partial"} textual match. The sanctioned individual was designated by ${sanction.authority} on the ${sanction.list_name} on ${sanction.effective_date} for the following: ${sanction.entity_notes}\n\n` +
      `However, the available evidence suggests these may be different individuals. The customer is a ${customer.nationality} national born ${customer.dob}, while the sanctioned entity is from ${sanction.nationality_country} with DOB ${sanction.dob}. Without additional corroborating identifiers beyond the name match, the probability of a true identification remains limited.\n\n` +
      `The reviewer should compare all available identifiers — full legal name, date of birth, nationality, address, and any document numbers — against the complete designation file before making a determination. Combined assessment score: ${combinedScore}%.`;

    return {
      reasoning,
      customerBackground: `Public records search for ${customer.full_name} (${customer.nationality}, born ${customer.dob}) returned no links to sanctioned activity.`,
      sanctionsBackground: `${sanction.authority} designated ${sanction.entity_name} on ${sanction.effective_date}. ${sanction.entity_notes}`,
      sources: [{ label: `${sanction.authority} Designation Notice`, url: sanction.citation_link }],
    };
  }

  // Calculate DOB difference for templates
  const customerYear = parseInt(customer.dob.split("-")[0], 10);
  const sanctionYear = parseInt(sanction.dob.split("-")[0], 10);
  const dobDiff = Math.abs(customerYear - sanctionYear);

  // Fill in templates
  const fillTemplate = (text: string) =>
    text
      .replace(/\{customerName\}/g, customer.full_name)
      .replace(/\{customerNationality\}/g, customer.nationality)
      .replace(/\{customerDob\}/g, customer.dob)
      .replace(/\{dobDiff\}/g, String(dobDiff))
      .replace(/\{combinedScore\}/g, String(combinedScore));

  // Build 3-paragraph reasoning: could be, could not be, assessment
  const reasoning = [
    fillTemplate(research.couldBeTemplate),
    fillTemplate(research.couldNotBeTemplate),
    fillTemplate(research.assessmentTemplate),
  ].join("\n\n");

  return {
    reasoning,
    customerBackground: fillTemplate(research.customerContextTemplate),
    sanctionsBackground: research.sanctionsContext,
    sources: research.sources,
  };
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

  // Build human-readable reasoning with contextual research
  const { reasoning, customerBackground, sanctionsBackground, sources } =
    buildHumanReadableReasoning(
      customer,
      sanction,
      flag,
      matchingSignals,
      conflictingSignals,
      combinedScore,
      routing
    );

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
    customer_background: customerBackground,
    sanctions_background: sanctionsBackground,
    sources,
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
