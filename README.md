# Enfuse — Sanctions & PEP Screening Triage Tool

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

- **Framework**: Next.js 16 (App Router, TypeScript)
- **UI**: HeroUI v3 + Tailwind CSS v4
- **Data Warehouse**: Snowflake (SQL API)
- **AI**: Snowflake Cortex (`COMPLETE()`) + Brave Search (`SEARCH_PREVIEW()`)
- **Auth**: Simple cookie-based demo auth (hardcoded credentials)

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment (optional)

The app works out of the box with mock data. To connect to a real Snowflake instance:

```bash
cp .env.example .env.local
```

| Variable | Description | Default |
|---|---|---|
| `DEMO_EMAIL` | Login email | `analyst@enfuse.demo` |
| `DEMO_PASSWORD` | Login password | `enfuse2026` |
| `SNOWFLAKE_ACCOUNT` | Snowflake account identifier | _(mock mode)_ |
| `SNOWFLAKE_WAREHOUSE` | Warehouse name | `COMPUTE_WH` |
| `SNOWFLAKE_DATABASE` | Database name | `SCREENING_DB` |
| `SNOWFLAKE_SCHEMA` | Schema name | `PUBLIC` |
| `SNOWFLAKE_API_TOKEN` | JWT token for SQL API | _(mock mode)_ |

### 3. Run the development server

```bash
npm run dev
```

### 4. Open the app

1. Go to [http://localhost:3000](http://localhost:3000)
2. Click **Launch Demo** or go to `/login`
3. Sign in with: `analyst@enfuse.demo` / `enfuse2026`

## Demo Walkthrough

1. **Screening Pipeline** (`/screening`) — Run Layer 1 deterministic screening, then trigger Layer 2 AI processing
2. **Review Queue** (`/queue`) — View cases routed to human review (10-90% confidence)
3. **Case Review** (`/review/[id]`) — Full three-panel review: field comparison, AI reasoning, and chat assistant
4. **Audit Log** (`/audit`) — Immutable record of every decision

### Demo Cases

| Customer | Confidence | Routing | Reason |
|---|---|---|---|
| Viktor Petrov | 95% | Auto-Restrict | Name + DOB + nationality exact match, multiple sources |
| John Smith | 6% | Auto-Clear | Common name, 20yr DOB gap, nationality mismatch |
| Ahmad Al-Hassan | 58% | Human Review | Name/nationality match but 2yr DOB discrepancy |
| Maria Santos Rodriguez | 42% | Human Review | Partial name match, common name, limited evidence |
| Chen Wei | 72% | Human Review | Alias exact match + DOB exact, but extremely common name |

## Snowflake Schemas

### Customer Table
`SNOWFLAKE_SAMPLE_DATA.TPCDS_SF100TCL.CUSTOMER`
- `C_CUSTOMER_ID`, `C_FIRST_NAME`, `C_LAST_NAME`
- `C_BIRTH_DAY`, `C_BIRTH_MONTH`, `C_BIRTH_YEAR`
- `C_BIRTH_COUNTRY`, `C_EMAIL_ADDRESS`

### Sanctions Table
`GLOBAL_SANCTIONS_DATA.SANCTIONS_DATAFEED`
- `ENTITY_ID`, `ENTITY_NAME`, `ENTITY_ALIASES`
- `DOB`, `NATIONALITY_COUNTRY`, `CITIZENSHIP_COUNTRY`
- `AUTHORITY`, `LIST_NAME`, `ENTITY_NOTES`, `CITATION_LINK`

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/          Login page
│   ├── (dashboard)/
│   │   ├── screening/         Screening pipeline dashboard
│   │   ├── queue/             Human review queue
│   │   ├── review/[id]/       Individual case review
│   │   └── audit/             Audit log viewer
│   └── api/screening/         API routes (run, layer2, queue, review, chat, audit)
├── components/screening/
│   ├── FieldComparison.tsx    Side-by-side customer vs watchlist
│   ├── ReasoningPanel.tsx     AI confidence + reasoning + signals
│   ├── AIChat.tsx             Embedded Cortex chat assistant
│   ├── DecisionBar.tsx        Approve/Reject with reason picker
│   ├── ConfidenceMeter.tsx    Visual confidence bar
│   ├── SourceList.tsx         Clickable source links
│   └── ReasonPicker.tsx       Quick-pick reason categories
├── lib/
│   ├── snowflake.ts           Snowflake SQL API client
│   ├── cortex.ts              Snowflake Cortex AI + Brave Search wrapper
│   ├── auth.ts                Simple cookie-based auth
│   └── screening/
│       ├── data.ts            Mock data (5 demo cases)
│       ├── layer1.ts          Jaro-Winkler scoring engine
│       ├── layer2.ts          Cortex batch processing
│       └── routing.ts         Confidence routing logic
└── types/screening.ts         Domain types
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run type-check` | TypeScript compiler check |
| `npm run format` | Format with Prettier |

## Deployment

1. Push to GitHub
2. Connect repo in Vercel
3. Set Snowflake environment variables (or leave blank for mock data)
4. Deploy
