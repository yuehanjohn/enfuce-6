-- Screening tables (replaces Snowflake ENFUSE_SCREENING database)

-- ── Customers ──────────────────────────────────────────────────────
create table public.screening_customers (
  customer_id text primary key,
  full_name text not null,
  dob date,
  nationality text,
  email text,
  entity_type text not null default 'INDIVIDUAL' check (entity_type in ('INDIVIDUAL', 'BUSINESS')),
  created_at timestamptz default now() not null
);

-- ── Watchlist (Sanctions / PEP) ────────────────────────────────────
create table public.screening_watchlist (
  entity_id text primary key,
  sr_no integer,
  listing_country text,
  authority text,
  list_name text,
  entity_type text,
  entity_name text not null,
  entity_aliases text,
  effective_date date,
  expiry_date date,
  entity_notes text,
  citation_link text,
  address text,
  country text,
  nationality_country text,
  citizenship_country text,
  dob date,
  pob text,
  call_sign text,
  vessel_type text,
  vessel_flag text,
  vessel_owner text,
  gross_tonnage text,
  gross_registered_tonnage numeric
);

-- ── Layer 1 Flags ──────────────────────────────────────────────────
create table public.screening_layer1_flags (
  flag_id text primary key,
  customer_id text not null references public.screening_customers(customer_id),
  entity_id text not null references public.screening_watchlist(entity_id),
  composite_score numeric not null,
  name_score numeric not null,
  dob_score numeric not null default 0,
  nationality_score numeric not null default 0,
  created_at timestamptz default now() not null
);

create index idx_layer1_customer on public.screening_layer1_flags(customer_id);
create index idx_layer1_score on public.screening_layer1_flags(composite_score desc);

-- ── Layer 2 Results ────────────────────────────────────────────────
create table public.screening_layer2_results (
  result_id text primary key,
  flag_id text not null references public.screening_layer1_flags(flag_id),
  customer_id text not null references public.screening_customers(customer_id),
  entity_id text not null references public.screening_watchlist(entity_id),
  ai_confidence numeric not null,
  routing text not null check (routing in ('AUTO_RESTRICT', 'AUTO_CLEAR', 'HUMAN_REVIEW')),
  reasoning text,
  matching_signals jsonb default '[]'::jsonb,
  conflicting_signals jsonb default '[]'::jsonb,
  sources jsonb default '[]'::jsonb,
  processed_at timestamptz default now() not null
);

create index idx_layer2_confidence on public.screening_layer2_results(ai_confidence desc);

-- ── Review Queue ───────────────────────────────────────────────────
create table public.screening_queue (
  queue_id text primary key,
  result_id text not null references public.screening_layer2_results(result_id),
  customer_id text not null references public.screening_customers(customer_id),
  entity_id text not null references public.screening_watchlist(entity_id),
  ai_confidence numeric not null,
  assigned_to text,
  queued_at timestamptz default now() not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'IN_REVIEW', 'DECIDED'))
);

create index idx_queue_status on public.screening_queue(status);

-- ── Decisions ──────────────────────────────────────────────────────
create table public.screening_decisions (
  decision_id text primary key,
  customer_id text not null references public.screening_customers(customer_id),
  result_id text not null references public.screening_layer2_results(result_id),
  decision text not null check (decision in ('APPROVE', 'REJECT')),
  trigger_type text not null default 'HUMAN' check (trigger_type in ('AUTO', 'HUMAN')),
  analyst_id text,
  reason_category text,
  analyst_note text,
  decided_at timestamptz default now() not null
);

-- ── Audit Log ──────────────────────────────────────────────────────
create table public.screening_audit_log (
  log_id text primary key,
  customer_id text not null,
  layer integer not null check (layer in (1, 2, 3)),
  event_type text not null,
  payload jsonb default '{}'::jsonb,
  analyst_id text,
  ai_chat_transcript text,
  created_at timestamptz default now() not null
);

create index idx_audit_created on public.screening_audit_log(created_at desc);

-- ── RLS (permissive for service role) ──────────────────────────────
-- Enable RLS on all screening tables. Service role key bypasses RLS automatically.
alter table public.screening_customers enable row level security;
alter table public.screening_watchlist enable row level security;
alter table public.screening_layer1_flags enable row level security;
alter table public.screening_layer2_results enable row level security;
alter table public.screening_queue enable row level security;
alter table public.screening_decisions enable row level security;
alter table public.screening_audit_log enable row level security;
