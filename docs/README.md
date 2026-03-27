# Documentation

Agent and developer reference for the SaaS starting template.

## Index

| Doc                                  | What it covers                                    |
| ------------------------------------ | ------------------------------------------------- |
| [structure.md](./structure.md)       | Full directory layout and file responsibilities   |
| [architecture.md](./architecture.md) | System design, data flow, request lifecycle       |
| [auth.md](./auth.md)                 | Supabase Auth — sessions, OAuth, route protection |
| [database.md](./database.md)         | Schema, RLS policies, migrations, triggers        |
| [payments.md](./payments.md)         | Stripe — plans, checkout, webhooks, portal        |
| [email.md](./email.md)               | Resend + React Email — templates and sending      |
| [state.md](./state.md)               | React Query + Zustand — when to use each          |
| [env.md](./env.md)                   | All environment variables with validation rules   |
| [middleware.md](./middleware.md)     | Route protection and session refresh logic        |

## Quick orientation

This is a Next.js App Router SaaS boilerplate. The three route groups are:

- `(auth)` — public auth pages
- `(dashboard)` — protected app behind login
- `(marketing)` — public landing/pricing/blog

Core integrations: **Supabase** (auth + database), **Stripe** (subscriptions), **Resend** (email).
