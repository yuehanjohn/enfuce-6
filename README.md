# SaaS Starting Template

A production-ready SaaS boilerplate built with Next.js 16, Supabase, Stripe, and HeroUI.

## Stack

- **Framework**: Next.js 16 (App Router, TypeScript strict mode)
- **UI**: HeroUI v3 + Tailwind CSS v4
- **Auth + DB**: Supabase (SSR-safe, RLS policies)
- **Payments**: Stripe (Checkout, Webhooks, Customer Portal)
- **Email**: Resend + React Email templates
- **Validation**: Zod
- **State**: Zustand (client) + React Query (server state)
- **Forms**: React Hook Form + Zod resolvers

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url>
cd saas-starting-template
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

| Variable                             | Description                                 |
| ------------------------------------ | ------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`                | Your app URL (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_SUPABASE_URL`           | Supabase project URL                        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`      | Supabase anon/public key                    |
| `SUPABASE_SERVICE_ROLE_KEY`          | Supabase service role key (server only)     |
| `STRIPE_SECRET_KEY`                  | Stripe secret key                           |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key                      |
| `STRIPE_WEBHOOK_SECRET`              | Stripe webhook signing secret               |
| `STRIPE_PRO_PRICE_ID`                | Stripe price ID for Pro plan                |
| `STRIPE_ENTERPRISE_PRICE_ID`         | Stripe price ID for Enterprise plan         |
| `RESEND_API_KEY`                     | Resend API key                              |
| `RESEND_FROM_EMAIL`                  | Verified sender email                       |

### 3. Database setup

Run the migration in your Supabase SQL editor:

```bash
# Copy contents of supabase/migrations/001_init.sql
# Paste into Supabase SQL Editor and run
```

### 4. Stripe setup

1. Create products and prices in Stripe Dashboard
2. Set the price IDs in your `.env.local`
3. Set up a webhook endpoint pointing to `/api/stripe/webhook`
4. Listen for: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

### 5. Run development server

```bash
npm run dev
```

## Scripts

| Command              | Description                   |
| -------------------- | ----------------------------- |
| `npm run dev`        | Start development server      |
| `npm run build`      | Build for production          |
| `npm run lint`       | Run ESLint                    |
| `npm run lint:fix`   | Fix ESLint errors             |
| `npm run format`     | Format with Prettier          |
| `npm run type-check` | Run TypeScript compiler check |
| `npm run analyze`    | Analyze bundle size           |

## Project Structure

```
src/
├── app/           # Next.js App Router pages
├── components/    # UI components
├── lib/           # Third-party client libraries
├── hooks/         # Custom React hooks
├── stores/        # Zustand stores
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
└── middleware.ts   # Route protection
```

## Deployment

Deploy to Vercel:

1. Push to GitHub
2. Connect repo in Vercel
3. Set all environment variables
4. Deploy

Remember to set your Stripe webhook URL to your production domain.
