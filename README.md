# Enfuce — Sanctions & PEP Screening Triage Tool

Intelligent three-layer screening pipeline that combines deterministic rules, OpenRouter AI reasoning, and human-in-the-loop review to screen customers against global sanctions and PEP lists.

## Architecture

```
100,000 Customers Onboarded
          |
  Layer 1: Hard Rule Engine        Deterministic · Jaro-Winkler · DOB · Nationality
          |
    ~300 Flagged Customers
          |
  Layer 2: AI Analysis             OpenRouter · Bright Data Search · Batch
          |
    >= 90%  -->  AUTO-RESTRICT
    <= 10%  -->  AUTO-CLEAR
    10-90%  -->  Human Queue
          |
  Layer 3: Human Review             Dashboard · AI Chat · Approve / Reject
```

## Stack

| Layer      | Technology                             |
| ---------- | -------------------------------------- |
| Framework  | Next.js 16 (App Router, TypeScript)    |
| UI         | HeroUI v3 + Tailwind CSS v4            |
| Database   | Supabase (PostgreSQL)                  |
| AI         | OpenRouter API (Claude Sonnet default) |
| Web Search | Bright Data SERP API                   |
| Auth       | Cookie-based demo auth                 |

---

## Quick Start (Demo Mode)

The app works out of the box with mock data — no external services required.

```bash
npm install
npm run dev
```

1. Open [http://localhost:3000](http://localhost:3000)
2. Sign in with `analyst@enfuce.demo` / `enfuce2026`
3. Navigate to **Screening** to run the pipeline

---

## Production Setup

### Prerequisites

- A Supabase project
- An OpenRouter API key
- (Optional) A Bright Data account for web search

### Step 1: Set Up Supabase Database

Run the migration files in your Supabase SQL editor:

```
supabase/migrations/
├── 001_init.sql                 # User tables (profiles, subscriptions, preferences)
├── 002_screening_tables.sql     # Screening tables (customers, watchlist, flags, results, queue, decisions, audit)
└── 003_screening_seed.sql       # Demo seed data (5 customers, 5 sanctions entries, pre-computed results)
```

### Step 2: Set Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
DEMO_EMAIL=analyst@enfuce.demo
DEMO_PASSWORD=enfuce2026

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenRouter
OPENROUTER_API_KEY=sk-or-v1-your-key
OPENROUTER_MODEL=anthropic/claude-sonnet-4

# Bright Data (optional)
BRIGHTDATA_API_TOKEN=your-token
BRIGHTDATA_ZONE=your-zone
```

### Step 3: Run

```bash
npm run dev
```

The app auto-detects configuration. When `SUPABASE_SERVICE_ROLE_KEY` is set, all reads/writes go to Supabase. Otherwise, it falls back to in-memory mock data.

---

## Database Schema Reference

All screening tables use the `screening_` prefix in the `public` schema:

```
public
├── screening_customers          customer_id, full_name, dob, nationality, email
├── screening_watchlist          entity_id, entity_name, aliases, dob, authority, list_name
├── screening_layer1_flags       flag_id, composite_score, name_score, dob_score, nationality_score
├── screening_layer2_results     result_id, ai_confidence, routing, reasoning, sources (jsonb)
├── screening_queue              queue_id, ai_confidence, status (PENDING/IN_REVIEW/DECIDED)
├── screening_decisions          decision_id, decision, trigger_type (AUTO/HUMAN), reason_category
└── screening_audit_log          log_id, layer (1/2/3), event_type, payload (jsonb)
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
├── supabase/
│   └── migrations/             3 SQL migration files (run in order)
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
│   │   ├── openrouter.ts       OpenRouter API client (LLM + chat)
│   │   ├── brightdata.ts       Bright Data SERP API client (web search)
│   │   ├── supabase/           Supabase client (server + browser)
│   │   ├── auth.ts             Cookie-based demo auth
│   │   └── screening/
│   │       ├── data.ts         Mock data (fallback when Supabase not configured)
│   │       ├── queries.ts      Supabase read/write layer
│   │       ├── layer1.ts       Jaro-Winkler scoring engine
│   │       ├── layer2.ts       OpenRouter batch processing orchestrator
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
