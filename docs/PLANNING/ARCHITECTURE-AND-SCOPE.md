---
title: "Pocket CGT Pro — Architecture and Scope"
tags: [pocket-cgt, planning, architecture, pro-tier]
status: draft
created: 2026-10-19
---

# Pocket CGT Pro — Architecture and Scope

> **Branch target:** `planning/pocket-cgt-pro`  
> **Repo state audited:** `main` @ `eccd0829e36c475673bb276330c4a4afaed08c60`  
> **Authoring agent:** Atom  
> **Rule:** NO CODE — this document is a build-ready plan only.

---

## 1. Current Architecture (source-of-truth audit)

### 1.1 Stack & runtime

| Layer | Technology | Evidence |
|-------|------------|----------|
| Build tool | Vite 5 + `@vitejs/plugin-react-swc` | `package.json:88-91`, `vite.config.ts:15` |
| Framework | React 18 + TypeScript 5 + `react-router-dom` | `package.json:57-62`, `src/App.tsx:17-23` |
| Styling | Tailwind CSS 3 + shadcn/ui (Radix primitives) | `package.json:46-67`, `src/components/ui/*` |
| Charts | Recharts | `package.json:63` |
| PDF export | jsPDF | `package.json:53`, `src/lib/reportExporter.ts:73-196` |
| CSV parsing | PapaParse | `package.json:56`, `src/lib/csvParser.ts:1-2` |
| State | Local React state; rate cache in `localStorage` + memory | `src/pages/Index.tsx:19-27`, `src/lib/exchange/rates.ts:3-58` |
| PWA | `manifest.json` + service worker | `public/manifest.json`, `public/sw.js` |
| Hosting | Vercel SPA rewrite | `vercel.json:2-4` |

### 1.2 Data flow

1. **Upload** — `CsvUpload` accepts `.csv` files, detects exchange via header preview (`src/components/CsvUpload.tsx:64`, `src/lib/exchange/detectExchange.ts:20-28`).
2. **Parse** — `csvParser.ts` streams each file through PapaParse, routes to `parseCoinSpot` or `parseBinance`, normalises to `RawTransaction[]` (`src/lib/csvParser.ts:34-57`).
3. **Deduplicate** — cross-file duplicates removed by composite key `(date, asset, type, amount, totalAud)` (`src/lib/csvParser.ts:66-80`).
4. **Rate conversion** — Binance USDT pairs fetch historical USDT→AUD (and BNB→USDT for fees) from CoinGecko with memory/localStorage cache (`src/lib/exchange/rates.ts:77-131`).
5. **Tax engine** — FIFO lot matching produces `TaxLot[]` plus unmatched-sell warnings (`src/lib/taxEngine.ts:5-84`).
6. **Presentation** — `SummaryCards`, `GainsChart`, `PerformanceTables`, `TaxLedger` render from derived state (`src/pages/Index.tsx:155-162`).
7. **Export** — `ExportMenu` triggers `exportCSV` or `exportPDF` entirely in the browser (`src/components/ExportMenu.tsx:19-37`, `src/lib/reportExporter.ts`).

### 1.3 Module map

```text
src/
├── App.tsx                 # Router + providers
├── pages/
│   ├── Index.tsx           # Upload → report orchestrator
│   ├── Privacy.tsx         # Disclosures
│   └── NotFound.tsx
├── components/
│   ├── Hero.tsx            # Free & client-side badge
│   ├── CsvUpload.tsx       # Drag-and-drop + exchange detection
│   ├── SummaryCards.tsx
│   ├── GainsChart.tsx
│   ├── PerformanceTables.tsx
│   ├── TaxLedger.tsx
│   ├── ExportMenu.tsx      # CSV/PDF triggers
│   ├── FinancialYearSelector.tsx
│   └── Footer.tsx
├── lib/
│   ├── types.ts            # RawTransaction, TaxLot, TaxSummary, etc.
│   ├── csvParser.ts
│   ├── taxEngine.ts        # FIFO, summaries, FY filter
│   ├── reportExporter.ts   # CSV + PDF generation
│   └── exchange/           # detectExchange, parsers, CoinGecko rates
└── test/                   # Vitest suite (tax engine, rates, CSV, export, UI)
```

### 1.4 Privacy model

- **No backend.** There is no API route, no database client, and no server-side persistence in the running app.
- `README.md:14,20` and `src/pages/Privacy.tsx` state that transaction data never leaves the device.
- CoinGecko API calls expose the user IP and requested coin/date; this is disclosed on `/privacy` (product context brief).

### 1.5 Existing Supabase artefacts (unintegrated)

- `SUPABASE_SETUP.sql` defines `pocket_cgt_users` and `pocket_cgt_subscriptions` tables with `subscription_status`, `stripe_customer_id`, `stripe_subscription_id`, and RLS policies.
- **The schema is not imported or referenced by application code.** `@supabase/supabase-js` is not in `package.json`. No Supabase URL/key is present in `.env.local`.
- This schema can be reused/extended for Pro, but doing so moves the app from “100% client-side” to “auth + billing backend” — a material product-positioning change (see §7).

---

## 2. Pro Tier Architecture Goals

1. Add a paid **Pro** tier without breaking the existing free experience.
2. Keep the core FIFO calculation and transaction data **in the browser**.
3. Use **Stripe** for billing and **Supabase** for auth/subscription state (schema already drafted).
4. Provide **reliable entitlement checks** for Pro-only features while respecting privacy.
5. Make the rollout reversible with a single feature flag.

---

## 3. High-Level Design

### 3.1 Runtime additions for Pro

| Component | Responsibility | Proposed Implementation |
|-----------|----------------|--------------------------|
| **Supabase Auth** | User identity | Email + magic-link and/or Google OAuth. Required to attach a Stripe customer. |
| **Supabase DB** | Subscription state | Extend existing `pocket_cgt_users` and `pocket_cgt_subscriptions`; add `processed_events` for webhook idempotency. |
| **Vercel API route / Edge Function** | Stripe webhooks | `POST /api/stripe/webhook` receives Stripe events, verifies signature, updates Supabase. |
| **Client entitlement layer** | Pro/Free decision | `useEntitlements()` hook reads Supabase session + subscription rows; derives `isPro`, `isTrialing`, `canExport`, `expiresAt`. |
| **Client gating components** | UX boundary | `<ProOnly>`, `<UpgradePrompt>`, `<PaywallModal>` (details in `UI-UX-SPEC.md`). |
| **Feature-flag table** | Staged rollout | Remote `feature_flags` row `pro_enabled` toggles Pro flows without a deploy. |

### 3.2 Entitlement enforcement options

Because tax-lot generation and PDF export are client-side, **pure UI gating can be bypassed**. The design must choose an acceptable enforcement posture.

| Option | Mechanism | Privacy Impact | Security | Recommendation |
|--------|-----------|----------------|----------|----------------|
| A — UI-only trust | Hide/export-disable Pro features in React | None | Low (dev-tools bypass) | Use for non-critical chrome only. |
| B — Server-side report | Send transactions to backend to generate PDF | High — violates current promise | High | Not recommended for v1. |
| C — Signed entitlement token (JWT) | Backend issues short-lived RS256 token; client verifies with embedded public key; token unlocks export | None — data stays local | Medium-High (forging requires server private key) | **Recommended for v1 export gating.** |
| D — Honor system | Free = full export; Pro = extra value-adds | None | N/A | Fallback if enforcement proves contentious. |

**v1 decision:** Use **Option C** to gate export/download actions, and **Option A** for cosmetic Pro badges/prompts. Document that this is “tamper-resistant, not tamper-proof,” and that true server enforcement requires sending data server-side.

### 3.3 Stripe integration design

#### Products & prices
- **Stripe product:** `Pocket CGT Pro` (yearly recurring).
- **Price IDs** live in environment variables only (`VITE_STRIPE_PRICE_ID_PRO_YEARLY` for server checkout creation; publishable key for Stripe.js). **No prices are hard-coded in source.**
- Optional trial: configured on the Stripe price or passed as `trial_period_days` during checkout creation.

#### Checkout flow
1. User clicks “Upgrade to Pro”.
2. Client calls a secure endpoint (Vercel serverless/Edge Function) that creates a Stripe Checkout Session with:
   - `client_reference_id` = Supabase `user.id`
   - `customer_email` = authenticated user email
   - `mode: subscription`
   - `line_items` = Pro yearly price
   - `success_url` / `cancel_url` back to app
3. User is redirected to Stripe.
4. On success, Stripe redirects back to app; client shows a “Confirming subscription…” state and re-fetches entitlements.

#### Customer portal
- Pro users can manage/cancel subscriptions via Stripe Customer Portal.
- Portal session created by a secure endpoint; link surfaced in account/settings UI.

#### Webhooks
- Endpoint: `POST /api/stripe/webhook` (Vercel function or Supabase Edge Function).
- Security:
  - Verify signature with `stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)`.
  - Return `400` on invalid signature; do not process.
- Idempotency:
  - Insert `stripe_event_id` into `processed_events` table with unique constraint.
  - Skip processing if the event already exists.
- Events handled:
  - `checkout.session.completed` → create/update user, set `subscription_status = active`.
  - `invoice.paid` → refresh `current_period_end`, status remains `active`.
  - `invoice.payment_failed` → set `subscription_status = past_due`; surface dunning UI.
  - `customer.subscription.updated` → sync status, cancel-at-period-end flag.
  - `customer.subscription.deleted` → set `subscription_status = cancelled`; downgrade on expiry.

#### Idempotency & retries
- All webhook handlers are wrapped in a DB transaction: insert event, update user/subscription.
- Duplicate `processed_events` insert fails safely; return `200` so Stripe stops retrying.

### 3.4 Data model changes

#### Reuse existing tables
```sql
-- Already present in SUPABASE_SETUP.sql (minor v1 additions proposed)
pocket_cgt_users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  subscription_status TEXT CHECK (...),   -- active | cancelled | trialing | inactive | past_due
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  entitlement_expires_at TIMESTAMPTZ,     -- NEW: derived from current_period_end
  trial_ends_at TIMESTAMPTZ,              -- NEW
  created_at, updated_at
);

pocket_cgt_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES pocket_cgt_users(id),
  status TEXT,
  price_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false, -- NEW
  created_at
);
```

#### New tables
```sql
processed_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

feature_flags (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### No changes to local domain types
- `RawTransaction`, `TaxLot`, `TaxSummary`, `CoinSummary`, `FinancialYear` (`src/lib/types.ts`) remain unchanged.
- Transaction data is **not** persisted to Supabase in v1.

### 3.5 Feature-gating matrix (v1 proposal)

| Capability | Free | Pro |
|------------|------|-----|
| Upload CSVs, FIFO preview, summary cards, chart, ledger | ✅ | ✅ |
| Export CSV/PDF | ✅ with “Pocket CGT Free” watermark / single-FY | ✅ Full, watermark-free, custom date range |
| Multi-year saved report history | ❌ | ✅ (if shipped in v1; otherwise deferred) |
| Advanced PDF layout (ATO schedule) | ❌ | ✅ |
| Priority support | ❌ | ✅ |
| Early exchange parsers | ❌ (or same as free) | ✅ early access |

> The exact boundary must be confirmed with product; see open questions in §7.

---

## 4. Migration & Rollback Plan

### 4.1 Migration sequence

1. **Branch:** `git checkout -b feat/pocket-cgt-pro` from latest `main`.
2. **Dependencies:** add `@supabase/supabase-js`, `@stripe/stripe-js`, and server-side `stripe` SDK.
3. **Environment:** add to Vercel/1Password:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `VITE_STRIPE_PUBLISHABLE_KEY`
   - `VITE_STRIPE_PRICE_ID_PRO_YEARLY`
4. **Database:** apply migration extending `SUPABASE_SETUP.sql` (add `entitlement_expires_at`, `trial_ends_at`, `cancel_at_period_end`, `processed_events`, `feature_flags`).
5. **Auth wrapper:** add `AuthProvider` around `<App />`; gate Pro checkout behind sign-in.
6. **Webhook endpoint:** create `/api/stripe/webhook` with signature verification + idempotency.
7. **Entitlement hook + gating components:** implement `useEntitlements`, signed-token flow, `<ProOnly>`/`<UpgradePrompt>`.
8. **Feature flag:** set `feature_flags.pro_enabled = false` initially; enable after QA.
9. **Privacy/terms:** update `/privacy` and add `/terms` covering account and billing data.
10. **QA:** run full test suite, webhook end-to-end with Stripe test mode, entitlement edge cases (expiry, offline, cancellation).

### 4.2 Rollback

- **Instant:** set `feature_flags.pro_enabled = false` → app reverts to free-only UX.
- **Clean:** revert branch; remove webhook endpoint; disable Stripe price; delete Supabase migration (irreversible only if user data exists; plan data-retention policy).
- **Customer-safe:** cancelled Pro users retain access until `current_period_end`; downgrade after expiry.

---

## 5. Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Privacy promise erosion | High reputational / product-context conflict | Keep CSV data local; only auth/billing metadata touches Supabase/Stripe; update `/privacy` explicitly. |
| Webhook spoofing | Billing fraud | Verify Stripe signature; idempotency via `processed_events`; 400 on invalid payloads. |
| Duplicate webhook processing | Corrupt subscription state | Unique `stripe_event_id`; transactional insert-then-update. |
| Offline PWA breaks entitlement check | Pro users blocked while offline | Cache latest entitlement + expiry locally; allow grace period if expiry > now and device offline. |
| Tax-season traffic spikes | Webhook backlog, DB load | Supabase/Stripe scale automatically; add Vercel function rate-limit if needed. |
| Trial abuse | Revenue loss | Stripe customer uniqueness + one-trial-per-customer configuration. |
| Dependency failure (Stripe/Supabase outage) | Users cannot upgrade/verify Pro | Fallback to free mode when entitlement service is unreachable; never block free features. |
| GST compliance | Legal/financial | Stripe Tax or manual GST handling; see `PRICING-AND-ECONOMICS.md`. |

---

## 6. Scope: v1 Pro vs Deferred

### 6.1 In v1 Pro (MVP)

- Supabase Auth (email magic-link + Google OAuth).
- Stripe yearly subscription (`Pocket CGT Pro`).
- Secure webhook handler with idempotency.
- Entitlement hook + signed-token export gating.
- Upgrade prompt/paywall in header and export menu.
- Updated `/privacy` and `/terms` pages.
- Feature flag `pro_enabled` for staged rollout.

### 6.2 Deferred to later releases

- Per-report / pay-as-you-go pricing.
- Saved report history / cloud sync.
- New exchange parsers marketed as Pro benefits.
- Accountant/client portal.
- Mobile app store builds (PWABuilder/App Store).
- Referral, coupon, and lifetime-license campaigns.
- Advanced analytics dashboard.
- Team/business multi-seat plans.

---

## 7. Product & Positioning Notes

- The current product context brief states: “**FREE** — always free. No paywall, no registration.” (`~/.openclaw/workspace/product-context/POCKET_CGT.md:51-53`).
- Introducing Pro is a deliberate change from that positioning. The build must update the product brief, the Hero badge (`src/components/Hero.tsx:10-13`), the `/privacy` copy, and possibly the `README.md` contribution clause that currently says “avoid adding backend dependencies or paid feature gates.”
- Recommended framing for v1: **“Core tax calculator remains free and private; Pro unlocks convenience features like saved history, advanced reports, and priority support.”**

---

## 8. Source-of-Truth Pricing Audit (Kai / VEX verification)

**Finding:** The application source contains **no pricing strings**.

- Searched `src/`, `app/`, `pages/`, `public/` for `14.99`, `179.88`, `monthly`, `yearly`, `subscription`, `price`, `pro`, `Pro`, `Stripe`.
- Result: no matches for dollar amounts or subscription pricing in source files.
- `rg '14\.99|179\.88' .` across the entire repo (including `dist/`) returned **zero results**.
- The only subscription-related artefacts are in `SUPABASE_SETUP.sql` (table schema), and these contain **no price values**.

**Conclusion:** VEX’s claimed contradictory prices are **not present in the current source tree or the current `dist/` build**. They may exist only in an older deployed artefact or in a different repo/branch that is not checked out here. Trove should verify pricing independently in Stripe dashboard history if available.

---

## 9. Open Questions / Owner Decisions

1. What is the exact Free vs Pro feature boundary? (This doc proposes a boundary; NaSy must confirm.)
2. Will v1 include saved report history, or keep all data strictly client-side?
3. Which auth methods are required at launch? (Email only? Google OAuth?)
4. Does the existing `SUPABASE_SETUP.sql` schema reflect the intended Supabase project, or is it a stale draft?
5. Who owns Stripe account/tax settings and will configure products/prices? (Trove/NaSy)
