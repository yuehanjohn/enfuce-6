# Architecture

## Overview

Next.js 16 App Router application with three route groups. All pages are server-rendered by default; client interactivity is opt-in via `"use client"`.

```
Browser → Next.js Middleware → Route Group → Server Component → Client Component
                ↓                                   ↓
         Session refresh                    Supabase / Stripe / Resend
```

## Request lifecycle

1. Every request hits `src/middleware.ts`, which calls `updateSession()` from `lib/supabase/middleware.ts`
2. `updateSession` refreshes the Supabase cookie session and enforces route protection (see [middleware.md](./middleware.md))
3. Request reaches the matching route group layout, then the page
4. Server Components call `createClient()` from `lib/supabase/server.ts` to query data
5. Client Components use `createClient()` from `lib/supabase/client.ts` or custom hooks

## Route groups

| Group         | Path prefix                                                                  | Auth required                              | Layout                    |
| ------------- | ---------------------------------------------------------------------------- | ------------------------------------------ | ------------------------- |
| `(marketing)` | `/`, `/pricing`, `/blog`                                                     | No                                         | Navbar + Footer           |
| `(auth)`      | `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/callback` | No (redirect to `/dashboard` if logged in) | Centered card             |
| `(dashboard)` | `/dashboard`, `/onboarding`, `/settings/*`                                   | Yes (redirect to `/login` if not)          | Sidebar + DashboardHeader |

## Data access patterns

### Server Components / API routes

```ts
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();
const {
  data: { user },
} = await supabase.auth.getUser();
```

### Client Components

```ts
import { useUser } from "@/hooks/use-user";
const { data: user, isLoading } = useUser();
```

### Webhook / service-role operations

The Stripe webhook (`app/api/stripe/webhook/route.ts`) creates a raw Supabase client with the service role key because there is no user cookie available:

```ts
createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
```

## State management

Two complementary layers — see [state.md](./state.md) for when to use each.

- **React Query** (`src/hooks/`) — async server state, automatic caching/refetch
- **Zustand** (`src/stores/user-store.ts`) — synchronous in-memory state for UI that needs instant access

## Environment validation

`src/env.ts` validates all required environment variables at startup using Zod. The build will throw an error if any variable is missing or malformed. Always import `env` from there:

```ts
import { env } from "@/env";
env.STRIPE_SECRET_KEY; // typed and validated
```

## Security

All responses include security headers defined in `next.config.ts`:

- CSP whitelist covers Stripe (`js.stripe.com`, `hooks.stripe.com`, `api.stripe.com`) and Supabase (`*.supabase.co`)
- HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- When adding third-party scripts or connections, update the CSP in `next.config.ts`

Database security is enforced via Row Level Security — all three tables (`profiles`, `subscriptions`, `user_preferences`) restrict all operations to the owning user. See [database.md](./database.md).
