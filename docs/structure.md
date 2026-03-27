# Directory Structure

```
src/
├── app/
│   ├── (auth)/                     # Unauthenticated-only pages
│   │   ├── auth/callback/          # OAuth redirect handler
│   │   ├── login/
│   │   ├── signup/
│   │   ├── forgot-password/
│   │   ├── reset-password/
│   │   └── layout.tsx              # Centered card layout
│   ├── (dashboard)/                # Requires authentication
│   │   ├── dashboard/
│   │   ├── onboarding/
│   │   ├── settings/
│   │   │   ├── profile/
│   │   │   ├── billing/            # Stripe management UI
│   │   │   └── security/
│   │   └── layout.tsx              # Sidebar + header shell
│   ├── (marketing)/                # Public pages
│   │   ├── page.tsx                # Landing page (/)
│   │   ├── pricing/
│   │   ├── blog/
│   │   └── layout.tsx              # Navbar + footer wrapper
│   ├── api/
│   │   ├── stripe/
│   │   │   ├── checkout/route.ts   # POST — create checkout session
│   │   │   ├── portal/route.ts     # GET — create customer portal
│   │   │   └── webhook/route.ts    # POST — handle Stripe events
│   │   └── user/route.ts           # GET — current user data
│   ├── layout.tsx                  # Root layout (Providers, fonts)
│   ├── error.tsx                   # Global error boundary
│   ├── not-found.tsx
│   └── globals.css
├── components/
│   └── layout/
│       ├── Providers.tsx           # React Query provider (client)
│       ├── Navbar.tsx
│       ├── Sidebar.tsx
│       ├── DashboardHeader.tsx
│       └── Footer.tsx
├── hooks/
│   ├── use-user.ts                 # React Query — user + profile
│   └── use-subscription.ts        # React Query — subscription row
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser client (use client components)
│   │   ├── server.ts               # Server client (use Server Components / API routes)
│   │   └── middleware.ts           # Session refresh + route guards
│   ├── stripe/
│   │   ├── client.ts               # Stripe SDK instance
│   │   └── plans.ts                # PLANS config + getPlanByPriceId()
│   └── resend/
│       ├── client.ts               # Resend SDK instance
│       └── templates/              # React Email components
│           ├── WelcomeEmail.tsx
│           ├── ResetPasswordEmail.tsx
│           ├── SubscriptionConfirmEmail.tsx
│           └── PaymentFailedEmail.tsx
├── stores/
│   └── user-store.ts               # Zustand — user + subscription state
├── types/
│   ├── index.ts                    # Plan, SubscriptionStatus, ApiError, PlanConfig
│   └── database.ts                 # Supabase table types (Row/Insert/Update)
├── utils/
│   └── api.ts
├── env.ts                          # Zod-validated env — import `env` from here
└── middleware.ts                   # Next.js middleware entry point

supabase/
└── migrations/
    └── 001_init.sql                # Full schema + RLS + triggers
```

## Key conventions

- `@/*` path alias resolves to `src/*`
- Never read `process.env` directly — use the `env` export from `src/env.ts`
- Server-side Supabase: `lib/supabase/server.ts` (async, cookie-based)
- Client-side Supabase: `lib/supabase/client.ts` (browser, `"use client"` only)
- Webhook handler uses raw `@supabase/supabase-js` with service role key (no user cookie context)
