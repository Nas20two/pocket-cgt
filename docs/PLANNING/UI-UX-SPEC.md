---
title: "Pocket CGT Pro — UI/UX Specification"
tags: [pocket-cgt, planning, ux, pro-tier]
status: active
created: 2026-10-19
---

> **Document purpose:** Define the user experience for the Pro tier launch. No code. All decisions traceable to source-code evidence or explicitly marked UNVERIFIED.
> **Source repo state verified at:** `~/pocket-cgt-web` commit read on 2026-10-19. All file:line references point to `src/` in that repo.
> **Target:** app.pocketcgt.com (PWA, mobile-first, client-side tool).

---

## 1. Current State (What Exists Today)

### 1.1 App Surface Area

| File | Lines | What it does |
|------|-------|--------------|
| `src/App.tsx` | 29 | Router with 3 routes: `/`, `/privacy`, `*` (catch-all). No auth, no account. |
| `src/pages/Index.tsx` | 170 | Single-page dashboard: upload → process → view results → export. |
| `src/pages/Privacy.tsx` | 113 | Privacy & Terms page. States: "No account, no tracking" (line 78–83). |
| `src/pages/NotFound.tsx` | 24 | Bare 404 page. |

### 1.2 Current User Flow

```
Landing (Hero) → Upload CSV → Processing spinner
                                    ↓
         Unmatched sells alert ← Results ready
                                    ↓
          [SummaryCards] [GainsChart] [PerformanceTables] [TaxLedger]
                                    ↓
                             ExportMenu (CSV | PDF)
```

### 1.3 Current Feature Inventory (All Free)

- **Upload**: Drag-and-drop or click-to-pick, multiple `.csv` files, auto-detects CoinSpot vs Binance (`src/components/CsvUpload.tsx:64`).
- **Parse**: Deduplication, warnings/errors via toast, USDT→AUD rate conversion via CoinGecko API (`src/lib/exchange/rates.ts`).
- **Engine**: FIFO lot matching, short/long-term CGT classification (`src/lib/taxEngine.ts`).
- **Results**:
  - Summary Cards: short-term, long-term, total net CGT (`src/components/SummaryCards.tsx`).
  - Gains Chart: monthly bar chart of gains/losses (`src/components/GainsChart.tsx`).
  - Performance Tables: top gains + top losses by coin (`src/components/PerformanceTables.tsx`).
  - Tax Ledger: searchable, sortable, filterable table (`src/components/TaxLedger.tsx`).
- **Export**: CSV report (full ledger) + PDF summary (ATO-formatted summary page) (`src/components/ExportMenu.tsx`, `src/lib/reportExporter.ts`).
- **Filter**: Financial year selector (`src/components/FinancialYearSelector.tsx`).

### 1.4 Design System (Current)

- **CSS framework**: Tailwind CSS v3.4.17 (`tailwind.config.ts`).
- **Component library**: shadcn/ui (Radix primitives) — full inventory in `src/components/ui/`, 50+ components available.
- **Color tokens**: CSS custom properties in `src/index.css` — HSL only, dark mode class supported.
- **Icons**: Lucide React (`lucide-react@0.462.0`).
- **Charts**: Recharts (`recharts@2.15.4`).
- **Toast/Sonner**: `src/components/ui/toaster.tsx`, `src/components/ui/sonner.tsx` — already dual-toast system in place.

### 1.5 Key UX Constraints from Source

- **100% client-side**: No server, no auth, no persistence. Page refresh = total reset.
- **"No account, no tracking"** (`src/pages/Privacy.tsx:78–83`) — this is a featured trust signal. Pro must not break this promise for free users.
- **PWA**: `manifest.json` exists (`public/manifest.json`), `apple-mobile-web-app-capable=yes`, service worker `sw.js` present.
- **Supported exchanges**: CoinSpot + Binance only (`src/lib/exchange/detectExchange.ts:20`). eToro not yet supported.

---

## 2. Free vs Pro UX Boundary

### 2.1 Principle: Progressive Disclosure, Not Frustration

The free tier must remain **genuinely useful** — it is the acquisition funnel. The Pro tier gates **convenience, scale, and permanence**, not the core calculation engine.

### 2.2 Feature Boundary Matrix

| Feature | Free Tier | Pro Tier | Rationale |
|---------|-----------|----------|-----------|
| **CSV upload** | ✅ Unlimited files, unlimited transactions | ✅ Same | Core value prop; gating this kills the funnel. |
| **FIFO calculation** | ✅ Full engine | ✅ Same | Calculations stay client-side. |
| **Summary Cards** | ✅ Full | ✅ Full | Users need to see their number to want to export it. |
| **Gains Chart** | ✅ Full | ✅ Full | Visualization is a trust builder. |
| **Performance Tables** | ✅ Full | ✅ Full | Same rationale. |
| **Tax Ledger** | ✅ First 10 rows only, read-only | ✅ Full, searchable, sortable, filterable | Gating the complete audit trail is the primary upgrade trigger. The free user sees "…and 47 more rows" with a CTA. |
| **CSV Export** | ❌ Watermarked sample (5 rows) | ✅ Full CSV | Direct output gating — the "job" is filing taxes. |
| **PDF Export** | ❌ Not available | ✅ Full ATO-formatted PDF | Premium deliverable for tax agents / ATO lodgement. |
| **Saved Reports** | ❌ Not available | ✅ Save to cloud, load later | Breaks the "refresh = reset" pain. |
| **Multi-year view** | ✅ Filter by year | ✅ Same + year-over-year comparison chart | Free gets filtering; Pro gets comparative analytics. |
| **Exchange support** | ✅ CoinSpot + Binance | ✅ + eToro, Swyftx, Independent Reserve | More exchanges = more value for power users. |
| **Report history** | ❌ Not available | ✅ Timeline of past reports | Unlocks "what did I claim last year?" |
| **Priority support** | ❌ Not available | ✅ In-app feedback → email | Differentiator at low cost. |

### 2.3 UX Pattern: The "Preview Gate"

For every Pro-gated feature, display a **partial preview** with a clear upgrade CTA. Do not show a blank state or a generic padlock.

**Example — Tax Ledger truncation:**
- Free: Shows first 10 rows. Row 11 is replaced by a centered card:
  - Copy: "Showing 10 of 57 tax lots. Unlock the full ledger, CSV export, and PDF report with Pocket CGT Pro."
  - CTA: "Upgrade to Pro — from $X/yr" (primary button)
  - Secondary: "Maybe later" (ghost button, dismisses for this session)
- Pro: Full table as currently rendered.

**Example — ExportMenu in Free:**
- Dropdown shows:
  - "Download CSV Report" → disabled with lock icon + tooltip: "Pro feature"
  - "Download PDF Summary" → disabled with lock icon + tooltip: "Pro feature"
  - Separator
  - "Upgrade to Pro" → primary CTA, opens upgrade modal

---

## 3. Upgrade Flow

### 3.1 Trigger Points (Where We Ask)

| # | Trigger | Context | Pattern |
|---|---------|---------|---------|
| 1 | **Truncated ledger view** | After processing >10 transactions, viewing Tax Ledger | Inline upsell card in table |
| 2 | **Export button click (Free)** | User clicks Export dropdown | Disabled items + inline CTA |
| 3 | **Session exit intent** | User about to close/refresh with data | "Save this report?" → upgrade prompt (Pro only) |
| 4 | **Post-calculation toast** | After successful processing | Secondary CTA in success toast: "Save & export with Pro" |
| 5 | **Landing page badge** | Hero section | Subtle "Pro" badge in header, clickable |
| 6 | **Direct navigation** | `/pro` or `/upgrade` route | Dedicated pricing page |

### 3.2 Paywall Design — Upgrade Modal

**Component name:** `UpgradeModal` (new, shadcn Dialog-based)

**States:**

```
┌─────────────────────────────────────────────┐
│  ✕  Upgrade to Pocket CGT Pro               │
├─────────────────────────────────────────────┤
│                                             │
│  [Pro Badge] Unlock everything you need     │
│  to lodge your crypto taxes confidently.    │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │  Unlimited Tax Ledger                 │  │
│  │  Full CSV + PDF export (ATO-ready)    │  │
│  │  Save reports across sessions         │  │
│  │  eToro, Swyftx & more exchanges       │  │
│  │  Year-over-year comparison            │  │
│  │  Priority email support               │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  [Annual  — $XX/yr  ← Best value]          │
│  [Monthly — $XX/mo]                         │
│                                             │
│  [        Pay securely with Stripe        ] │
│                                             │
│  🔒 No credit card stored. Cancel anytime.  │
│  Already have Pro? [Sign in]                │
└─────────────────────────────────────────────┘
```

**Accessibility:**
- Dialog traps focus (`Dialog` from Radix already does this).
- `aria-labelledby` points to the title, `aria-describedby` to the feature list.
- Close button has `aria-label="Close"`.
- Price toggle uses a `role="radiogroup"` with `aria-checked` on each option.

### 3.3 Pricing Page — `/pro`

**New route:** Add to `src/App.tsx:18` alongside existing routes.

**Layout:**
- Hero: "Simple crypto tax reporting. One price."
- Plan cards (2-up on desktop, stacked on mobile):
  - **Free**: Checkmark list of what's included, greyed out for what's not, "Current plan" badge if free.
  - **Pro**: Highlighted (border-primary, subtle background tint), full feature list with checkmarks, CTA button.
- FAQ accordion: "Is my data safe?" → reiterate client-side processing. "Can I cancel?" → Yes, anytime. "What exchanges?" → List supported.
- Trust bar: Stripe logo, ATO-friendly badge, privacy badge.
- Footer link back to app.

**Mobile:** Cards stack vertically. Sticky "Upgrade" CTA at bottom (80px safe area) when user scrolls past the plan cards.

---

## 4. Onboarding Changes

### 4.1 Current Onboarding = None

Today there is zero onboarding. User lands, sees Hero, uploads CSV. This is fine for a free tool, but Pro introduces **account creation** — a friction point that needs careful UX.

### 4.2 Pro Onboarding Philosophy

**Delayed auth.** Do not ask users to create an account until they click "Upgrade." The free experience must remain zero-friction.

### 4.3 Pro Checkout Flow

```
User clicks "Upgrade"
      ↓
[Upgrade Modal] → user selects plan → clicks "Pay with Stripe"
      ↓
Stripe Checkout (redirect or embedded) — UNVERIFIED: depends on Stripe integration approach
      ↓
Success → redirect back to app with ?checkout=success
      ↓
[Post-purchase Onboarding Modal]
  • "Welcome to Pro!" headline
  • "What's your email?" (for receipt + account recovery)
  • "Create a password" OR "Continue with Google/Apple"
  • "Save your first report" CTA (auto-saves current session's data)
      ↓
App refreshes with Pro badge in header, full features unlocked
```

### 4.4 Account Recovery

Since the app has been "no account," existing users who later upgrade need a **graceful bridge**:
- If a free user has data in their current session and upgrades, auto-save it to their new Pro account.
- If a free user upgrades on a fresh session, start empty (no migration needed — there was no persistence).

### 4.5 Sign-In / Sign-Up Modal

**Component name:** `AuthModal`

- Tabs: "Sign In" | "Sign Up"
- Fields: Email, Password (with visibility toggle), "Forgot password?"
- OAuth: Google, Apple (if implemented — UNVERIFIED: availability depends on Supabase/auth provider config)
- Error states: Invalid credentials, email not found, already exists
- Success: Modal closes, header updates with avatar + "Pro" badge, toast: "Signed in as [email]"

---

## 5. Component Inventory + States

### 5.1 Existing Components (Reused As-Is)

All existing components listed in §1 remain, with the following behavioral changes for Pro:

| Component | Free Behavior | Pro Behavior | Source Ref |
|-----------|---------------|--------------|------------|
| `CsvUpload` | Same | Same | `src/components/CsvUpload.tsx:55` |
| `SummaryCards` | Same | Same | `src/components/SummaryCards.tsx:28` |
| `GainsChart` | Same | Same | `src/components/GainsChart.tsx:11` |
| `PerformanceTables` | Same | Same | `src/components/PerformanceTables.tsx:108` |
| `FinancialYearSelector` | Same | Same | `src/components/FinancialYearSelector.tsx:16` |
| `ExportMenu` | Disabled items with upgrade CTA | Fully enabled | `src/components/ExportMenu.tsx:19` |
| `TaxLedger` | Truncated to 10 rows + upsell card | Full table | `src/components/TaxLedger.tsx:40` |

### 5.2 New Components (Pro Tier)

| Component | Purpose | shadcn/ui Base | States |
|-----------|---------|----------------|--------|
| `UpgradeModal` | Paywall / plan selection | `Dialog` + `Tabs` | loading, error (Stripe fail), success |
| `AuthModal` | Sign in / Sign up | `Dialog` + `Tabs` + `Input` | idle, submitting, error, success |
| `ProBadge` | Header indicator of Pro status | `Badge` | — |
| `UserMenu` | Header dropdown (avatar, settings, sign out) | `DropdownMenu` | signed-in, signed-out |
| `SavedReportsDrawer` | List of saved reports | `Sheet` (mobile) / `Dialog` (desktop) | empty, loading, error, populated |
| `ProPricingCard` | Pricing plan display | `Card` | selected, not-selected |
| `TruncationUpsell` | Inline upsell in gated free features | `Card` with `Button` | — |
| `StripeCheckoutEmbed` | Embedded Stripe checkout | `iframe` or Stripe Elements | loading, error, complete |
| `YearComparisonChart` | Multi-year stacked bar chart | `recharts` BarChart | empty, loading, data |
| `ReportHistoryTimeline` | Chronological report list | Custom list + `Badge` | empty, loading, populated |

### 5.3 Component State Specifications

#### `TaxLedger` — Truncated State (Free)

```tsx
// Pseudocode for state logic — NOT implementation
const FREE_ROW_LIMIT = 10;
const isTruncated = !isPro && lots.length > FREE_ROW_LIMIT;
const displayLots = isTruncated ? lots.slice(0, FREE_ROW_LIMIT) : lots;
```

**UI after last displayed row:**
- `Card` with `bg-muted/50` containing:
  - `Lock` icon (Lucide)
  - Text: "{lots.length - FREE_ROW_LIMIT} more tax lots hidden"
  - Subtext: "Upgrade to Pro to view the full ledger, export CSV, and download your ATO-ready PDF."
  - Primary CTA button: "Upgrade to Pro"
  - Dismiss link: "Maybe later" (sets `localStorage` flag `upsell_dismissed_until` = +24h)

#### `ExportMenu` — Free State

```
DropdownMenuContent:
  ├─ DropdownMenuItem [disabled] ── Lock icon ── "CSV Report (Pro)"
  ├─ DropdownMenuItem [disabled] ── Lock icon ── "PDF Summary (Pro)"
  ├─ DropdownMenuSeparator
  └─ DropdownMenuItem [primary CTA] ── "Upgrade to Pro →"
```

**Hover/Focus on disabled items:** Tooltip reads "Unlock with Pocket CGT Pro."

#### `UpgradeModal` — State Machine

| State | UI |
|-------|----|
| `idle` | Plan selector active, CTA enabled |
| `redirecting` | Spinner on CTA, "Redirecting to Stripe…" |
| `error` | Inline alert: "Something went wrong. Try again or contact support." |
| `success` | Post-purchase onboarding (§4.3) |

---

## 6. Mobile-First & PWA Considerations

### 6.1 Current PWA State

- **Manifest**: `public/manifest.json` — name, short_name, icons 192/512, standalone display, theme colors.
- **Viewport**: `width=device-width, initial-scale=1.0` (`index.html:5`).
- **Service worker**: `public/sw.js` present but not verified for functionality.

### 6.2 Mobile UX Requirements for Pro

#### Responsive Breakpoints (existing Tailwind)

Current breakpoints from `tailwind.config.ts:11`:
- `sm:` 640px
- `md:` 768px
- `lg:` 1024px
- `xl:` 1280px
- `2xl:` 1400px

All Pro UI must follow existing patterns:
- `flex-col` below `sm`, `sm:flex-row` at `sm`+ (`src/pages/Index.tsx:104`).
- Tables: `overflow-x-auto` wrapper (`src/components/TaxLedger.tsx:109`).
- Cards: `grid gap-4 md:grid-cols-2` or `md:grid-cols-3` (`src/components/SummaryCards.tsx:30`).

#### Touch Targets

- All interactive elements min 44×44px (WCAG 2.5.5).
- Existing `Button size="icon" className="h-7 w-7"` (`src/components/CsvUpload.tsx:199`) is below target — **Pro UI must use `h-10 w-10`** minimum for new buttons.
- Dropdown menus (`ExportMenu`) on mobile: use `Sheet` (bottom drawer) instead of `DropdownMenu` for plan selection and upgrades to avoid overflow issues.

#### Mobile-Specific Patterns

| Pattern | Desktop | Mobile |
|---------|---------|--------|
| Upgrade Modal | Centered `Dialog` | Full-screen `Sheet` from bottom |
| Auth Modal | Centered `Dialog` | Full-screen `Sheet` from bottom |
| Saved Reports | Sidebar or `Dialog` | `Sheet` sliding from right |
| Export Menu | `DropdownMenu` | `Sheet` with action buttons |
| Pricing Page | 2-column plan cards | Stacked cards, sticky CTA |

#### Safe Areas

- iOS notch / Dynamic Island: `env(safe-area-inset-top)` — add to header.
- Home indicator: `env(safe-area-inset-bottom)` — ensure `padding-bottom` on fixed CTAs.

#### Offline Behavior

- Free tier: Already works offline after first load (service worker). CSV processing is client-side.
- Pro tier requiring auth: **Degrade gracefully.** If offline and user is Pro-signed-in, show cached data with an offline banner. Do not block the app.

### 6.3 Add-to-Home-Screen Prompt

Since Safari no longer supports `beforeinstallprompt`, add a manual onboarding step for Pro users:
- After first successful report save (Pro), show a toast: "Install Pocket CGT to your home screen for one-tap access next tax season."
- iOS: Show `Sheet` with visual instructions (Share → Add to Home Screen).
- Android: Same toast + Chrome-specific instructions if detectable.

---

## 7. Accessibility Notes

### 7.1 Current Accessibility State

**Strengths found in source:**
- `aria-hidden="true"` on decorative icons (`src/components/Hero.tsx:11`, `src/components/CsvUpload.tsx:142`).
- `aria-label="Upload CSV files"` on drop zone (`src/components/CsvUpload.tsx:132`).
- `aria-label="Remove file"` on delete button (`src/components/CsvUpload.tsx:207`).
- `role="button"`, `tabIndex={0}`, keyboard handler for Enter/Space on drop zone (`src/components/CsvUpload.tsx:124–130`).
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` on drop zone (`src/components/CsvUpload.tsx:118`).

**Gaps found:**
- No `skip-to-content` link.
- No `aria-live` region for dynamic content updates (toast system handles some but not all).
- `Table` headers in `TaxLedger` are clickable for sorting but not announced as sortable to screen readers.
- No `lang="en-AU"` on `<html>` (`index.html` has `lang="en"`).

### 7.2 Pro Accessibility Requirements

#### A11y Checklist (New Components)

| Requirement | Implementation |
|-------------|----------------|
| Keyboard trap | Already handled by Radix `Dialog`. Verify with `Tab`/`Shift+Tab`. |
| Focus management | On modal open, focus first focusable element. On close, return focus to trigger. |
| `aria-live` for async | Add `aria-live="polite"` region for "Processing payment…" / "Payment successful." |
| Color contrast | Pro badge / primary buttons must be ≥ 4.5:1 against background. Use existing `--primary` token (`hsl(222.2 47.4% 11.2%)` on `hsl(0 0% 100%)` → ~12:1, passes). |
| Form labels | All auth form fields must have visible `<Label>` + `htmlFor` linked to `Input id`. |
| Error announcements | Form errors must use `aria-describedby` + `role="alert"` or `aria-live="assertive"`. |
| Disabled state | Disabled menu items must have `aria-disabled="true"` (not just `disabled` attribute, which removes from tab order). |
| Price toggle | Plan selector (Annual/Monthly) must use `role="radiogroup"` with `role="radio"` on each option. |

#### Screen Reader Considerations

- **Truncated table**: After the 10th row, the upsell card must be announced as a region (`role="region" aria-label="Upgrade to Pro"`).
- **Saved reports list**: Each report item needs `aria-label` with date, financial year, and transaction count.
- **Chart updates**: `GainsChart` and new `YearComparisonChart` need `aria-label` describing the chart data, or a visually hidden table with the same data for screen readers (Recharts does not produce accessible charts by default).

#### Focus Order Diagram (Upgrade Flow)

```
1. [Trigger: "Upgrade to Pro" button] → focus
2. [UpgradeModal opens] → focus "Annual" radio (first interactive)
3. User tabs through → Monthly → Feature list (skippable) → Pay button
4. [Payment success] → focus "Email" input in Post-Purchase modal
5. [Complete] → modal closes → focus returns to trigger button
```

---

## 8. Header & Navigation Changes

### 8.1 Current Header

```
Pocket CGT                    [FinancialYearSelector] [ExportMenu]
Australian crypto capital gains — 100% client-side
```

(`src/pages/Index.tsx:103–112`)

### 8.2 Pro Header

```
Pocket CGT    [Pro Badge]     [FinancialYearSelector] [Saved Reports] [ExportMenu] [Avatar → UserMenu]
Australian crypto capital gains — 100% client-side
```

**Breakpoints:**
- `< md`: Logo + hamburger menu (contains FinancialYearSelector, Saved Reports, Export, UserMenu as a `Sheet`).
- `≥ md`: Full layout as above.

**Avatar component:**
- Pro signed-in: `Avatar` with initials from email (`src/components/ui/avatar.tsx` already exists).
- Free: "Sign In" text button + "Upgrade" primary button.

---

## 9. Routes & Navigation Map

### 9.1 Current Routes

| Route | Page | Auth |
|-------|------|------|
| `/` | `Index` | None |
| `/privacy` | `Privacy` | None |
| `*` | `NotFound` | None |

### 9.2 Pro Routes (Additions)

| Route | Page | Auth Required | Notes |
|-------|------|--------------|-------|
| `/pro` | `ProPricing` | No | Public pricing page. |
| `/checkout/success` | `CheckoutSuccess` | No (session-validated) | Stripe redirect. Shows onboarding. |
| `/checkout/cancel` | `CheckoutCancel` | No | Stripe redirect. "Payment cancelled." + retry CTA. |
| `/settings` | `Settings` | Yes | Account, billing, delete data. |
| `/reports` | `SavedReports` | Yes | List of all saved reports. |

**Implementation note:** `BrowserRouter` currently used (`src/App.tsx:17`). For futureauth, consider moving to code-split lazy routes (`React.lazy`) if bundle size grows.

---

## 10. Error & Edge Case UX

### 10.1 Stripe Errors

| Scenario | UX |
|----------|-----|
| Payment declined | Inline error in modal: "Your card was declined. Please try a different payment method." |
| 3D Secure required | Stripe handles this; show spinner during redirect. |
| Network timeout | "Connection lost. Your payment was not processed. Please try again." + retry button. |
| Webhook failure (backend) | User still sees success if Stripe Checkout succeeded. Backend reconciles async. Toast: "Welcome to Pro! It may take a moment for your account to fully activate." |

### 10.2 Account Edge Cases

| Scenario | UX |
|----------|-----|
| User upgrades on Device A, opens on Device B | Sign in required. "Sign in to access your Pro reports." |
| Session expires | Silent refresh if possible. If not, "Your session has expired. Please sign in again." |
| Subscription cancels | Grace period: keep Pro until end of billing period. Then degrade to Free gracefully — saved reports become read-only with "Resubscribe to Pro" CTA. |
| Password forgotten | "Forgot password?" → email reset link flow. |

### 10.3 Free-to-Pro Data Transition

| Scenario | UX |
|----------|-----|
| Free user has active session, upgrades | Auto-save current report. Toast: "Your current report has been saved to your Pro account." |
| Free user upgrades on fresh session | No data to migrate. Standard empty state. |
| Pro user downgrades to Free | Show banner: "Your Pro subscription has ended. Your reports are safe — resubscribe anytime to access them." Free features still work; gated features show upsell. |

---

## 11. Toast / Notification Strategy

### 11.1 Existing Toast System

Dual system: `use-toast` (Radix Toast) + Sonner (`sonner@1.7.4`). Both already imported in `App.tsx`.

### 11.2 Pro Toast Events

| Event | Toast Style | Copy |
|-------|-------------|------|
| Upgrade initiated | Info | "Opening secure checkout…" |
| Upgrade success | Success | "Welcome to Pocket CGT Pro! 🎉 Your reports are now unlimited." |
| Report saved | Success | "Report saved to your Pro account." |
| Report loaded | Info | "Loaded report from {date}." |
| Subscription ending (7d) | Warning | "Your Pro subscription expires in 7 days. Renew to keep your saved reports." |
| Subscription ended | Destructive | "Pro features are now locked. Resubscribe to unlock your reports." |
| Sign in success | Success | "Signed in as {email}." |
| Sign out | Info | "Signed out. Your data is still on this device." |

---

## 12. Visual Spec — Pro Badge & Accent System

### 12.1 Pro Branding

The Pro tier needs subtle but clear differentiation without breaking the existing calm monochrome palette.

**Approach:** Gold/amber accent for Pro elements (conveys premium without medical/clinical blue).

| Element | Token | Value | Source |
|---------|-------|-------|--------|
| Pro badge background | `--pro-badge-bg` | `hsl(45 93% 47%)` | New token |
| Pro badge foreground | `--pro-badge-fg` | `hsl(0 0% 100%)` | New token |
| Pro card border (selected) | `--pro-border` | `hsl(45 93% 47%)` | New token |
| Upgrade CTA button | Reuse `--primary` | `hsl(222.2 47.4% 11.2%)` | Existing (`src/index.css:20–21`) |
| Upsell card background | `--muted` | `hsl(210 40% 96.1%)` | Existing (`src/index.css:26`) |

### 12.2 Dark Mode

All Pro tokens must have `.dark` variants. Follow existing pattern in `src/index.css:58–94`.

---

## 13. Analytics & Telemetry (UX-Only, No Implementation)

The Privacy page says "no tracking" (`src/pages/Privacy.tsx:78–83`). **Free tier stays tracking-free.**

Pro tier may use **minimal, privacy-preserving telemetry** for UX improvement:
- Funnel: "Opened upgrade modal" → "Selected plan" → "Reached Stripe" → "Completed purchase"
- Feature usage: "Saved a report", "Exported PDF", "Used year filter"
- No personal data, no third-party ad trackers.
- Documented in updated Privacy page under "Telemetry" section (see §14).

---

## 14. Privacy Page Updates

The existing `Privacy.tsx` must be updated for Pro:

**Additions:**
- **Accounts section**: "Pro users create an account with email + password or OAuth. We store your email, password hash, Stripe customer ID, and saved report metadata. Transaction data in saved reports is encrypted at rest."
- **Payment section**: "Payments processed by Stripe. We do not store your card details."
- **Telemetry section**: "We collect anonymous event data (e.g., 'upgrade modal opened') to improve the product. No personal or transaction data is included."
- **Data deletion section**: "You can delete your account and all saved reports at any time from Settings."

---

## 15. File Delivery Checklist

| File | Status | Notes |
|------|--------|-------|
| `UI-UX-SPEC.md` (this doc) | ✅ Complete | Written to `~/pocket-cgt-web/docs/PLANNING/` |

---

## Appendix A: Source Evidence Index

All claims about "what exists today" trace to these files:

| Claim | File | Lines |
|-------|------|-------|
| No auth, 3 routes | `src/App.tsx` | 1–29 |
| No pricing in source | `src/`, `package.json` | grep for "price", "cost", "plan", "tier", "pro" returned no product/pricing code |
| 100% client-side | `src/pages/Privacy.tsx` | 42–44, 78–83 |
| CoinSpot + Binance only | `src/lib/exchange/detectExchange.ts` | 20–27 |
| PWA manifest present | `public/manifest.json` | 1–23 |
| shadcn/ui full inventory | `src/components/ui/` | 53 component files |
| Dual toast system | `src/App.tsx` | 1–2, 14–16 |
| Tax ledger has search/sort/filter | `src/components/TaxLedger.tsx` | 40–182 |
| Export produces CSV + PDF | `src/components/ExportMenu.tsx`, `src/lib/reportExporter.ts` | — |
| Financial year filtering | `src/components/FinancialYearSelector.tsx` | 1–32 |
| No account onboarding | `src/pages/Index.tsx` | 101–166 (upload is first interaction) |

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **FIFO** | First-In, First-Out lot matching method for CGT. |
| **CGT** | Capital Gains Tax (Australian tax on asset sales). |
| **ATO** | Australian Taxation Office. |
| **CoinSpot / Binance / eToro** | Cryptocurrency exchanges. |
| **Tax Lot** | A unit of a crypto asset with an acquisition date, cost basis, and sale details. |
| **Upsell** | In-app prompt to upgrade from Free to Pro. |
| **Paywall** | UI pattern that blocks a feature behind a purchase. |
