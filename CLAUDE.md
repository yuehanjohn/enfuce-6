# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Lint src/ with ESLint
npm run lint:fix     # Auto-fix lint issues
npm run format       # Format with Prettier
npm run type-check   # TypeScript check without emit
npm run analyze      # Bundle analysis (ANALYZE=true next build)
```

There are no automated tests configured. Type checking with `type-check` is the primary correctness gate.

## Architecture

This is a production-ready SaaS boilerplate using **Next.js App Router** with three route groups:

- `(auth)` — Unauthenticated pages: login, signup, password reset, OAuth callback
- `(dashboard)` — Protected pages: dashboard, onboarding, settings (profile/billing/security)
- `(marketing)` — Public pages: landing, pricing, blog

### Data Flow

**Authentication** is handled entirely by Supabase. `src/middleware.ts` refreshes the session on every request. The `lib/supabase/server.ts` client is used in Server Components and API routes; `lib/supabase/client.ts` in Client Components.

**User data** flows through two complementary systems:

- `useUser()` hook (`src/hooks/use-user.ts`) — React Query, for async-fetched server state
- `useUserStore` (`src/stores/user-store.ts`) — Zustand, for synchronous global access

**Payments** via Stripe: checkout and portal sessions created in `app/api/stripe/`, subscription state synced to `subscriptions` table via webhook at `/api/stripe/webhook`. Plan definitions live in `lib/stripe/plans.ts`.

**Email** via Resend with React Email templates in `lib/resend/templates/`.

**Environment variables** are validated at startup by Zod in `src/env.ts`. Always access env vars via the `env` export from that file, not `process.env` directly.

### Database

Three Supabase tables with RLS (users access only their own rows):

- `profiles` — user identity, auto-created on signup via trigger
- `subscriptions` — Stripe billing state
- `user_preferences` — theme, onboarding status

Migrations live in `supabase/migrations/`. TypeScript types are in `src/types/database.ts`.

### Key Patterns

- **Path alias**: `@/*` maps to `src/*`
- **Route protection**: Middleware handles session; no per-page auth checks needed
- **Server vs. client Supabase**: Use `lib/supabase/server.ts` in `async` server context, `lib/supabase/client.ts` in `"use client"` components
- **Stripe webhooks**: Must validate signature using `STRIPE_WEBHOOK_SECRET`; handler updates `subscriptions` table directly
- **CSP headers**: Stripe and Supabase domains are whitelisted in `next.config.ts` — update there when adding third-party scripts
