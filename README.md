# Kreddt

A production-structured Next.js 14 + Prisma app for managing Ajo/Esusu contribution
groups and vendor installment ("pay small small") plans, built from the Kreddt PRD.

## Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS
- **Backend:** Next.js API routes, service-layer architecture
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** Custom JWT session cookie (httpOnly), bcrypt password hashing, RBAC middleware

## Frontend design rule

All new frontend development, redesigns, and component restructures must follow
[`FRONTEND_DESIGN_SKILLS.md`](./FRONTEND_DESIGN_SKILLS.md) as the single source
of UI/UX implementation rules for the Vendor Hub experience.

## Folder structure

```
src/
  app/                # Pages (App Router) + API routes
    api/               # REST endpoints, grouped by resource
    (auth)/login|signup
    dashboard/         # Role-based dashboard
    groups/[id]/       # Group detail: contributions, rotation wheel, payouts
    vendor/            # Vendor dashboard + installment tracking
  lib/                 # Cross-cutting: prisma client, auth/session, validation, api helpers
  services/            # Business logic, one module per domain (group, contribution,
                       # payout, vendor, dashboard, audit) — API routes stay thin and
                       # only orchestrate service calls + validation
  components/          # ui/ (primitives), layout/ (shell), groups/ (RotationWheel), vendor/
  middleware.ts        # Route protection (redirects unauthenticated users)
prisma/
  schema.prisma        # Full data model from the PRD
  seed.ts              # Demo data (admin, members, vendor, customer)
```

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env
   # then edit DATABASE_URL to point at your Postgres instance
   # (Supabase / Neon / Railway / local Postgres all work)
   ```

3. **Set up the database**

   ```bash
   npx prisma migrate dev --name init
   npm run seed   # optional demo data, password123 for every seeded account
   ```

4. **Run the app**
   ```bash
   npm run dev
   ```
   Visit http://localhost:3000

## Vendor Hub DB checklist

Run this before testing Vendor Hub pages to catch schema drift and missing tables/columns:

```bash
npm run db:check
```

This verifies:

- Required tables (`User`, `Product`, `Installment`, `Payment`, `WalletWithdrawal`, `ProductPackage`, `ProductPackageItem`, `VendorPolicyTemplate`, `AuditLog`)
- Required Installment policy columns
- Required indexes/foreign keys
- Required migrations (`0006_policy_templates`, `0007_policy_schema_repair`)
- Basic role data presence (`VENDOR`, `CUSTOMER`)

If connectivity fails:

- Set `DATABASE_URL` to the Supabase pooler URL (usually `:6543`, with `sslmode=require`).
- Set `DIRECT_URL` to session mode URL (usually `:5432`, with `sslmode=require`).
- Keep `PRISMA_USE_DIRECT_URL="false"` unless you explicitly need direct connection mode.

## Demo accounts (after `npm run seed`)

| Role     | Email               | Password    |
| -------- | ------------------- | ----------- |
| Admin    | admin@kreddt.dev    | password123 |
| Member   | amaka@kreddt.dev    | password123 |
| Vendor   | vendor@kreddt.dev   | password123 |
| Customer | customer@kreddt.dev | password123 |

## Business rules enforced in the service layer

- A contribution amount must exactly match the group's configured `contribution_amount`.
- Payouts complete strictly in `payout_order` sequence; the API rejects out-of-order
  or duplicate completion (guarded with a DB transaction).
- Installment `balance` is clamped at zero and a plan cannot accept a payment larger
  than its outstanding balance.
- Every contribution, payout, and payment write is mirrored into an append-only
  `AuditLog` table (`services/auditService.ts`).

## What's implemented vs. left as next steps

**Implemented (MVP scope from PRD §14):** auth + RBAC, group creation, member
management with auto/manual payout order, contribution recording + defaulter
detection, payout sequence generation + strict-order completion, vendor products,
installment plans, payment recording, role-based dashboards.

**Left for you to extend (PRD §15, post-MVP):** WhatsApp/SMS reminders (the manual
"trigger reminder" hook in §4.7 is a good place to wire this in), Paystack payment
integration, CSV/PDF report export, analytics, and credit scoring.
