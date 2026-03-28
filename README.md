# Enfuce — Sanctions & PEP Screening Triage Tool

Intelligent three-layer screening pipeline that combines deterministic rules, Snowflake Cortex AI reasoning, and human-in-the-loop review to screen customers against global sanctions and PEP lists.

## Architecture

```
100,000 Customers Onboarded
          |
  Layer 1: Hard Rule Engine        Deterministic · Jaro-Winkler · DOB · Nationality
          |
    ~300 Flagged Customers
          |
  Layer 2: AI Warehouse            Snowflake Cortex · Brave Search · Batch
          |
    >= 90%  -->  AUTO-RESTRICT
    <= 10%  -->  AUTO-CLEAR
    10-90%  -->  Human Queue
          |
  Layer 3: Human Review             Dashboard · AI Chat · Approve / Reject
```

## Stack

| Layer          | Technology                                   |
| -------------- | -------------------------------------------- |
| Framework      | Next.js 16 (App Router, TypeScript)          |
| UI             | HeroUI v3 + Tailwind CSS v4                  |
| Data Warehouse | Snowflake (SQL API)                          |
| AI             | Snowflake Cortex (`COMPLETE()`)              |
| Web Search     | Brave Search via Cortex (`SEARCH_PREVIEW()`) |
| Auth           | Cookie-based demo auth                       |

---

## Quick Start (Demo Mode)

The app works out of the box with mock data — no Snowflake account required.

```bash
npm install
npm run dev
```

1. Open [http://localhost:3000](http://localhost:3000)
2. Sign in with `analyst@enfuce.demo` / `enfuce2026`
3. Navigate to **Screening** to run the pipeline

---

## Snowflake Setup (Production Mode)

### Prerequisites

- A Snowflake account with **Cortex LLM Functions** enabled
- `ACCOUNTADMIN` or equivalent role for initial setup
- A warehouse (e.g. `COMPUTE_WH`)

### Step 1: Create Database & Schemas

Run the migration files in order in the Snowflake SQL Worksheet:

```bash
snowflake/migrations/
├── 001_create_database.sql     # Database + schemas
├── 002_customers.sql           # CUSTOMERS.ONBOARDING table
├── 003_watchlist.sql           # WATCHLIST.SANCTIONS_PEP table
├── 004_layer1_flags.sql        # SCREENING.LAYER1_FLAGS + Jaro-Winkler UDF
├── 005_layer2_results.sql      # SCREENING.LAYER2_RESULTS table
├── 006_queue.sql               # QUEUE.PENDING_REVIEW table
├── 007_decisions.sql           # DECISIONS.RESTRICTIONS + CLEARANCES
└── 008_audit_log.sql           # AUDIT.LOG table
```

Execute each file in sequence:

```sql
-- In Snowflake SQL Worksheet, run each migration file:
-- 1. Open 001_create_database.sql → Execute
-- 2. Open 002_customers.sql → Execute
-- 3. ... through 008_audit_log.sql
```

### Step 2: Seed Demo Data

```bash
snowflake/seed/
├── 001_seed_customers.sql      # 5 demo customers
├── 002_seed_watchlist.sql      # 5 matching sanctions entries
├── 003_run_layer1.sql          # Run Layer 1 screening
└── 004_run_layer2_cortex.sql   # Layer 2 Cortex procedure + execution
```

```sql
-- Run in order:
-- 1. 001_seed_customers.sql
-- 2. 002_seed_watchlist.sql
-- 3. 003_run_layer1.sql
-- 4. For Layer 2, run the stored procedure:
CALL SCREENING.PROCESS_LAYER2_BATCH();
```

### Step 3: Configure API Token

Generate a keypair JWT for the Snowflake SQL API:

```bash
# Generate RSA key pair
openssl genrsa 2048 | openssl pkcs8 -topk8 -inform PEM -out rsa_key.p8 -nocrypt
openssl rsa -in rsa_key.p8 -pubout -out rsa_key.pub

# Set the public key in Snowflake
ALTER USER your_user SET RSA_PUBLIC_KEY='<paste public key without headers>';
```

Then generate a JWT token (see [Snowflake SQL API docs](https://docs.snowflake.com/en/developer-guide/sql-api/authenticating)).

### Step 4: Set Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
DEMO_EMAIL=analyst@enfuce.demo
DEMO_PASSWORD=enfuce2026

SNOWFLAKE_ACCOUNT=your-org-your-account    # e.g. myorg-myaccount
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_DATABASE=ENFUSE_SCREENING
SNOWFLAKE_SCHEMA=PUBLIC
SNOWFLAKE_API_TOKEN=your-jwt-token
```

### Step 5: Run

```bash
npm run dev
```

The app auto-detects Snowflake configuration. When `SNOWFLAKE_ACCOUNT` and `SNOWFLAKE_API_TOKEN` are set, all reads/writes go to real Snowflake. Otherwise, it falls back to in-memory mock data.

---

## Using Real Sanctions Data

### Option A: Snowflake Marketplace

1. In Snowflake, go to **Marketplace** → search for **"Global Sanctions Data"**
2. Install the `GLOBAL_SANCTIONS_DATA` listing
3. Create a view in your watchlist schema:

```sql
CREATE OR REPLACE VIEW WATCHLIST.SANCTIONS_PEP AS
SELECT * FROM GLOBAL_SANCTIONS_DATA.CYBERSYN.SANCTIONS_DATAFEED;
```

### Option B: TPC-DS Sample Customers

Use Snowflake's built-in sample data for customer records:

```sql
CREATE OR REPLACE VIEW CUSTOMERS.ONBOARDING AS
SELECT
    C_CUSTOMER_ID AS customer_id,
    TRIM(COALESCE(C_FIRST_NAME,'') || ' ' || COALESCE(C_LAST_NAME,'')) AS full_name,
    TRY_TO_DATE(C_BIRTH_YEAR||'-'||LPAD(C_BIRTH_MONTH,2,'0')||'-'||LPAD(C_BIRTH_DAY,2,'0')) AS dob,
    C_BIRTH_COUNTRY AS nationality,
    C_EMAIL_ADDRESS AS email,
    'INDIVIDUAL' AS entity_type,
    CURRENT_TIMESTAMP() AS created_at
FROM SNOWFLAKE_SAMPLE_DATA.TPCDS_SF100TCL.CUSTOMER
WHERE C_FIRST_NAME IS NOT NULL AND C_LAST_NAME IS NOT NULL
LIMIT 100000;
```

---

## Snowflake Schema Reference

```
ENFUSE_SCREENING
├── CUSTOMERS
│   └── ONBOARDING              customer_id, full_name, dob, nationality, email
├── WATCHLIST
│   └── SANCTIONS_PEP           entity_id, entity_name, aliases, dob, authority, list_name
├── SCREENING
│   ├── LAYER1_FLAGS            flag_id, composite_score, name_score, dob_score, nationality_score
│   ├── LAYER2_RESULTS          result_id, ai_confidence, routing, reasoning, sources (VARIANT)
│   └── JARO_WINKLER_SIMILARITY()  JavaScript UDF for fuzzy name matching
├── QUEUE
│   └── PENDING_REVIEW          queue_id, ai_confidence, status (PENDING/IN_REVIEW/DECIDED)
├── DECISIONS
│   ├── RESTRICTIONS            decision_id, trigger_type (AUTO/HUMAN), reason_category
│   └── CLEARANCES              decision_id, trigger_type (AUTO/HUMAN), reason_category
└── AUDIT
    └── LOG                     log_id, layer (1/2/3), event_type, payload (VARIANT)
```

---

## Demo Walkthrough

1. **Screening Pipeline** (`/screening`) — Run Layer 1 + Layer 2 in sequence
2. **Review Queue** (`/queue`) — View cases routed to human review (10-90% confidence)
3. **Case Review** (`/review/[id]`) — Three-panel layout: field comparison, AI reasoning, chat
4. **Audit Log** (`/audit`) — Immutable record of every decision

### Demo Cases

| Customer               | Confidence | Routing       | Reason                                                   |
| ---------------------- | ---------- | ------------- | -------------------------------------------------------- |
| Viktor Petrov          | 95%        | Auto-Restrict | Name + DOB + nationality exact match, multiple sources   |
| John Smith             | 6%         | Auto-Clear    | Common name, 20yr DOB gap, nationality mismatch          |
| Ahmad Al-Hassan        | 58%        | Human Review  | Name/nationality match but 2yr DOB discrepancy           |
| Maria Santos Rodriguez | 42%        | Human Review  | Partial name match, common name, limited evidence        |
| Chen Wei               | 72%        | Human Review  | Alias exact match + DOB exact, but extremely common name |

---

## Project Structure

```
├── snowflake/
│   ├── migrations/             8 SQL migration files (run in order)
│   └── seed/                   Demo data + Layer 1/2 execution scripts
├── src/
│   ├── app/
│   │   ├── (auth)/login/       Login page
│   │   ├── (dashboard)/
│   │   │   ├── screening/      Pipeline dashboard
│   │   │   ├── queue/          Review queue
│   │   │   ├── review/[id]/    Case review panel
│   │   │   └── audit/          Audit log viewer
│   │   └── api/screening/      REST API (run, layer2, queue, review, chat, audit)
│   ├── components/screening/   7 review UI components
│   ├── lib/
│   │   ├── snowflake.ts        Snowflake SQL API client (REST, polling, VARIANT parsing)
│   │   ├── cortex.ts           Snowflake Cortex AI + Brave Search wrapper
│   │   ├── auth.ts             Cookie-based demo auth
│   │   └── screening/
│   │       ├── data.ts         Mock data (fallback when Snowflake not configured)
│   │       ├── snowflake-queries.ts   Real Snowflake read/write layer
│   │       ├── layer1.ts       Jaro-Winkler scoring (TypeScript mirror of UDF)
│   │       ├── layer2.ts       Cortex batch processing orchestrator
│   │       └── routing.ts      Confidence → routing logic
│   └── types/screening.ts     Domain types
└── .env.example                Environment variable template
```

## Scripts

| Command              | Description               |
| -------------------- | ------------------------- |
| `npm run dev`        | Start development server  |
| `npm run build`      | Build for production      |
| `npm run lint`       | Run ESLint                |
| `npm run type-check` | TypeScript compiler check |
| `npm run format`     | Format with Prettier      |
