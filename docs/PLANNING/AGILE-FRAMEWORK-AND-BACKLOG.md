---
title: "Pocket CGT Pro — Agile Framework and Backlog"
tags: [planning, backlog, agile, pocket-cgt, pro-tier]
status: draft
created: 2026-10-19
---

# Pocket CGT Pro — Agile Framework and Backlog

**Author:** Honey · **Date:** 2026-10-19
**Dispatch:** Kai 2026-10-19 (planning only — NO CODE) · **Owner decision:** NaSy
**Repo:** `~/pocket-cgt-web` → github.com/Nas20two/pocket-cgt · **Branch (push):** `planning/pocket-cgt-pro` (coordinated by Atom)

## 0. Verification state (read before planning)

Facts verified against the repo at commit `eccd082` (HEAD, main), 2026-10-19:

| Claim | Status | Evidence |
|---|---|---|
| Pricing is NOT in current source | ✅ VERIFIED | `grep -rniE "14\.99\|179\.88\|stripe\|subscription" src/` → zero pricing-tier hits (only CSV "Price" columns + CoinGecko `current_price` API fields) |
| Pricing is NOT in current build output | ✅ VERIFIED | same grep on `dist/` → zero hits |
| Stripe was integrated then REMOVED | ✅ VERIFIED | git history: `f43257c` Add Stripe payment + Pricing page → `7e1d5d6` yearly-only fix → `0b8e3e6` Pricing/Account buttons → **`d3d06cf` strip pricing/stripe code and prep for open source** |
| VEX's "three contradictory prices" ($14.99/yr vs /mo vs $179.88/yr) | ✅ CONFIRMED ABSENT in current tree | Stale — they lived in pre-strip code/old dist. **Do not reintroduce**; new pricing is single-source-of-truth (see EPIC-B / BC-7). |
| App is 100% client-side today | ✅ VERIFIED | `package.json` (no backend dep), `README.md` ("no data is uploaded to any server"), `src/App.tsx` routes (`/`, `/privacy`, catch-all) |
| Free-tier promise in README | ✅ VERIFIED | "No sign-up, no pricing gate — drop your files in and get your report" + contributing rule: "avoid adding backend dependencies or paid feature gates" |
| Supported exchanges today | ✅ VERIFIED (2 only) | `src/lib/exchange/` contains `coinspotParser.ts` + `binanceParser.ts` only; README table lists CoinSpot, Binance |
| eToro support | ⚠️ UNVERIFIED — NOT in code | Dispatch mentions CoinSpot/Binance/eToro. No eToro parser exists in `src/lib/exchange/`. Treat as **roadmap**, not current. |
| June EOFY peak | ⚠️ PER DISPATCH (external) | "aimed at the June EOFY peak (not October… per live Google Trends)" — Kai dispatch. Trends claim not locally re-verifiable; taken as given for timing. |
| $2K/mo revenue target | ⚠️ PER DISPATCH | Kai dispatch. Economics modeled in Trove's `PRICING-AND-ECONOMICS.md` (dependency). |
| Vela CSV incident | ✅ VERIFIED (documented) | `~/.buzz/RESEARCH/VELA_ARCHITECTURE_REVIEW_ATOM.md` — hand-rolled parser failed on escaped quotes, multi-line cells, BOM, CRLF; no size cap; MIME-only check; no row validation. Fixed via papaparse (branch `fix/vela-w5-papaparse`). **This drives EPIC-E below.** |

**Cross-doc dependencies:** pricing/$ → Trove `PRICING-AND-ECONOMICS.md`; UX/paywall/component states → THORN `UI-UX-SPEC.md`; architecture/entitlement/webhooks/data model → Atom `ARCHITECTURE-AND-SCOPE.md`. This backlog treats those docs' decisions as inputs; where a story needs a decision from them it is flagged **[DEP]**.

---

## 1. Guiding principles (non-negotiable)

1. **The free calculator never regresses.** Privacy-first, sign-up-free CSV→CGT report is the product's soul and its traffic engine. Pro gates add *features*, never remove or degrade free ones.
2. **One pricing truth.** The $14.99 triple-contradiction is the cautionary tale: a single prices config (single source of truth) + tests that assert displayed price === Stripe price === webhook price.
3. **Never repeat the Vela CSV failure** (EPIC-E): parser changes ship only with the full edge-case matrix green.
4. **Facts over pressure.** No invented metrics in the UI, on the pricing page, or in analytics. (VEX credibility gate applies to product copy too, not just outreach.)
5. **Rollout is staged and reversible** (EPIC-F): feature flag + Stripe test mode + launch cohort before public.

---

## 2. Epics

| Epic | Name | Outcome |
|------|------|---------|
| EPIC-A | Pro entitlement & account | A user with a valid Pro entitlement can unlock Pro features across sessions, on device, without a forced account wall. Privacy-first. |
| EPIC-B | Stripe billing integration | Checkout → payment → webhook → entitlement, idempotent, test-mode first, single pricing source. |
| EPIC-C | Feature gating & upgrade UX | Clear free/Pro boundary, right-timed upgrade triggers, paywall + pricing page per THORN `UI-UX-SPEC.md`. |
| EPIC-D | Pro feature set | The v1 Pro deliverables (final list per Trove pricing + THORN spec; candidates in D-1). |
| EPIC-E | CSV robustness & reliability | Vela-class edge cases covered; parser changes prove themselves on the fixture matrix. |
| EPIC-F | Analytics, staging & rollout | Success metrics wired, feature-flagged staged rollout, launch ready for June EOFY. |

---

## 3. EPIC-A — Pro entitlement & account

**Goal:** Pro works without betraying the privacy promise (no mandatory cloud sync of tax data; entitlement is separate from transaction data).

### A-1 Verify entitlement locally across sessions
**AC:** Given a user who completed a Pro checkout, when they reopen the app (same device/browser), then Pro features remain unlocked without re-entering payment. Given cleared site data, the app shows Pro as locked (entitlement is not silently permanent).
**Notes:** Implementation direction per Atom architecture: signed entitlement token + server verify OR Stripe customer lookup. **[DEP: Atom decision A-2/A-3]**

### A-2 Decision: entitlement storage model
**AC:** A written decision (ADR) recording how entitlement is stored & verified: (a) localStorage token + server-side verify, (b) Stripe Customer Portal subscription status fetch, (c) other. Must state offline behaviour (PWA) explicitly — e.g. cached entitlement with TTL and re-verify on next connect. Unverified = feature unavailable, never "all features unlocked" fallback.
**Notes:** This is the single riskiest architecture choice. Owned by Atom; this story exists to force the decision + an ADR before build.

### A-3 Grace/expiry behaviour
**AC:** Given a Pro user whose subscription lapses, when they use the app, then they keep access to already-generated reports but new Pro features are locked; UI explains how to re-subscribe (Stripe customer portal). No data loss.

### A-4 No-account privacy path preserved
**AC:** A non-Pro user can complete the full free workflow (upload → report → export) with zero sign-up and zero email capture. No interstitial may block the free path. **Regression-gated in DoD.**

---

## 4. EPIC-B — Stripe billing integration

**Goal:** Pay once, unlock reliably. Test mode → live mode staged.

### B-1 Products & prices in a single config
**AC:** All prices (id, label, cadence, AUD amount) live in one typed config file. A unit test asserts the config matches Stripe product/price IDs in test mode. No string literal price anywhere else. (Kills the $14.99-class bug by construction.)
**Notes:** Final amount/cadence per Trove `PRICING-AND-ECONOMICS.md` **[DEP]**; candidate framing (SATORI: $29/yr or $9/report vs Koinly/Summ $75–150) noted for Trove.

### B-2 Checkout flow
**AC:** Given a user clicks upgrade, when they complete Stripe Checkout, then they are redirected back with a success state; the app verifies the session; Pro unlocks. Given checkout is abandoned or fails, the app returns to its previous state with a non-alarming message. No double-charge on double-click of "upgrade" (button disabled while session is created).

### B-3 Webhook handling — idempotent
**AC:** Events `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` are processed idempotently (event id store). Replay of the same event changes nothing twice. Webhook signature is verified (Stripe-Secret). Failure to process → retry queue; no silent drop.
**Notes:** Webhook endpoint requires a backend function (serverless OK per Atom) — this is the one place the app gains a server dependency. Reviewed against the README "no backend" promise: scoped to billing only, not data. **[DEP: Atom webhook architecture]**

### B-4 Stripe test mode end-to-end
**AC:** With Stripe test keys, a tester completes a purchase with test card `4242…`, webhook fires, entitlement unlocks in the app, refund/cancel path behaves per A-3. Asserted in CI where feasible (contract test on webhook handler with fixture events).

### B-5 Billing edge cases
**AC:** Handles: card decline at checkout; webhook out of order (completed before updated); duplicate webhook (idempotency); subscription created in customer portal not via our checkout; USD/AUD currency assumptions (all AUD ex-GST per dispatch; GST note in costs is Trove's).

### B-6 Refunds & disputes
**AC:** A refund or chargeback revokes Pro entitlement on next verification. Documented in ADR. (Privacy: no user tax data touched by this path.)

---

## 5. EPIC-C — Feature gating & upgrade UX

**Goal:** Users always understand what's free, what's Pro, and exactly why they should upgrade — at the moment they feel the pain.

### C-1 Free/Pro boundary rendered consistently
**AC:** Every Pro feature in the UI meets ONE of: visible-but-locked (with upgrade CTA), or hidden behind a paywall screen. No grey zone ("sometimes works"). Boundary matrix lives in THORN `UI-UX-SPEC.md`; this story wires it to one gate component. **[DEP: THORN]**

### C-2 Upgrade trigger points
**AC:** The app surfaces upgrade CTAs at defined moments (per THORN spec): e.g. after first report generated, on Pro-feature click, at PDF export if export is Pro. CTA appears max N times per session (config) — no nagging. **[DEP: THORN trigger list]**

### C-3 Paywall screen
**AC:** Paywall states (empty/loading/error/paid) all rendered per THORN spec. Payment success transitions to the locked feature completing its original action (user doesn't have to redo it). **[DEP: THORN states]**

### C-4 Pricing page
**AC:** `/pricing` route (re-added; was stripped) renders live Stripe prices from the single config, not hard-coded text. Update to config = update to page. Legal lines: refund/cancel policy, "No financial advice", GST note per Trove. **[DEP: Trove pricing, THORN layout]**

### C-5 PWA/offline handling
**AC:** Given offline, the app shows the cached state (entitlement TTL per A-2). Upgrade CTA offline → friendly "you're offline" state; checkout is not attempted offline. No crash, no false "upgraded" state.

---

## 6. EPIC-D — Pro feature set (v1)

**Goal:** Ship the smallest Pro set that a user would pay for at EOFY, and defer the rest.

### D-1 Final Pro feature list (decision story)
**AC:** An explicit, NaSy-signed v1 Pro feature list — each item with a one-line user benefit and the marginal COGS (Trove). No feature ships without a line here.
**Candidate pool (NOT locked):** unlimited/high-volume CSV + PDF exports; multi-year historical reports retained across sessions (vs single session today); premium exchange parsers (eToro/Coinbase/Kraken — NEW parsers, significant work); advanced CGT scenarios (cost-base adjustments, CGT discount interplay, personal-use asset thresholds); accountant-ready bundled report pack; early access to new parsers. **Final cut: Trove economics + NaSy.**

### D-2 D-1 feature implementation (per-feature stories)
**Template AC:** Given a Pro user, when they use [feature], then [outcome] works and is visibly branded Pro. Given a free user, the same path shows the locked state from C-1. Performance budget: no feature may add >[threshold] latency to the free path (PWA/CSV-heavy features must not block the main thread — Vela lesson on large payloads).

### D-3 Deferred (explicit non-goals for v1)
**AC:** Documented "later" list so no one builds it early: account/cloud sync of tax data (privacy wall), eToro/more parsers (unless D-1 selects them), mobile native app, multi-user/accountant team views, API.

---

## 7. EPIC-E — CSV robustness & reliability (do not repeat Vela)

**Goal:** The Vela incident becomes institutional memory: parser changes prove themselves, or they don't ship.

### E-1 Edge-case fixture matrix (expand current fixtures)
**AC:** The fixture set grows to cover every failure mode that broke Vela plus CSV reality. Matrix (each row = a fixture + a test that asserts parse outcome):

| # | Edge case | Vela link | Expected behaviour |
|---|-----------|-----------|--------------------|
| 1 | Escaped quotes `""` inside quoted fields | Vela: hand-rolled parser failed | Field parsed correctly; no row corruption |
| 2 | Multi-line cells (embedded `\n` in quotes) | Vela: failed | Cell intact; row count correct |
| 3 | UTF-8 BOM prefix on first header | Vela: failed | Headers detected (BOM stripped) |
| 4 | CRLF line endings (Excel/Windows export) | Vela: failed | Parsed identically to LF |
| 5 | Oversized file (>10 MB) | Vela: no cap → memory blowup | Rejected with a clear message before parse; app stays responsive |
| 6 | MIME `application/vnd.ms-excel` (not `text/csv`) | Vela: MIME-only check missed it | Accepted via extension fallback |
| 7 | Unrecognised format | Vela: fell through to AI parser → garbage | Friendly "unsupported format, here's what we support" error; **never** proceeds to a report |
| 8 | Header-only file (no data rows) | regression guard | "No transactions found" state, no crash |
| 9 | Empty file / blank lines only | regression guard | Same graceful error |
| 10 | Quoted field containing delimiter (`,` inside quotes) | Vela-adjacent | Field intact |
| 11 | Scientific-notation numbers / trailing whitespace in amount columns | regression guard | Parsed correctly or warn-row, never NaN |
| 12 | Non-UTF8 encoding (latin-1 style) | Vela-adjacent | Decode strategy documented; best-effort with warning |
| 13 | Wrong delimiter (semicolon, EU locale) | Vela-adjacent | Detected as unsupported format with helpful message |
| 14 | Duplicate file upload of identical file | already covered (csvParser.test) | Deduped; no double-counting |
| 15 | Cross-exchange merge (CoinSpot + Binance) | already covered | FIFO across merged feed is correct |
| 16 | Unmatched sell | already covered (VEX 🔴 4.2) | Non-dismissible warning; report still produced with flag |
| 17 | Futures/margin row | already covered (VEX 1.2) | Rejected with reason; excluded from FIFO |

**Notes:** Items 1–4, 5, 6, 7 are the direct Vela retro. Items 8–13 are CSV-reality guards. Existing coverage (14–17) is retained and must stay green.

### E-2 Test-first rule for parser changes
**AC:** Any parser/CSV change requires: (1) failing fixture test added first (red), (2) implementation makes it green, (3) full `npm test` green incl. all matrix rows, (4) `tsc --noEmit` clean, (5) `npm run build` clean. No exceptions.

### E-3 Large-file & performance guard
**AC:** CI includes a performance smoke (large synthetic fixture, e.g. 50k rows) asserting parse+engine completes under a budget and doesn't block the UI thread (async chunking). Budget number set at grooming; default 10s total at 50k rows.

### E-4 Error-state UX
**AC:** Every rejection in the matrix shows a *specific, human* message (which part failed, what's supported), per THORN component states (empty/loading/error/paid). Errors never show raw stack traces.

---

## 8. EPIC-F — Analytics, staging & rollout — plus success metrics

### F-1 Success metrics (event wiring)
**AC:** Events fire (privacy-first, aggregate-only where possible — see F-3) for: upload success rate (uploads → reports completed), export events, upgrade viewed/started/completed, webhook failures, activation (report generated this session). Metrics dashboard is a single doc (this section) — no invented numbers; each metric has a definition.

### F-2 Metric targets (draft, to be owned by Trove/NaSy)
| Metric | Target (EST) | Definition |
|--------|-------------|-----------|
| Upload→report completion rate | ≥90% of uploads produce a report | completions / uploads |
| Free→Pro conversion | 1–3% of monthly active calculators (EST) | upgrades / monthly calculators |
| Revenue | $2K/mo recurring (dispatch target) | MRR from subscriptions |
| CSV error rate | <2% of uploads hit a hard error (EST) | error uploads / uploads |
| June EOFY spike | **est.** +80–150% of baseline visitors (EST, unverified) | monthly visitors vs Feb–May baseline |
| Churn | <5%/mo (EST — benchmarking required) | cancellations / active subs |

**All above marked EST/UNVERIFIED** until Trove validates against real funnel data. No number ships to a public page without a source or an EST label.

### F-3 Privacy-preserving analytics decision
**AC:** ADR records the analytics approach (e.g. privacy-first: no personal identifiers, aggregate counters only; or Vercel Analytics / Plausible / GA4). Must not collect transaction data. **[DEP: NaSy privacy stance]**

### F-4 Feature flag
**AC:** `PRO_ENABLED` (and `PRO_ENV=test|live`) flags gate the entire Pro surface. Default false in production until go/no-go. Flag flipped per staged cohort. Free tier works with flag on or off.

### F-5 Staged rollout plan
| Stage | Gate | Contents |
|-------|------|----------|
| 0. Planning freeze | All 4 planning docs signed by NaSy | This + Atom + THORN + Trove docs |
| 1. Build (sprints S1–S4) | DoD green each sprint | Feature-flagged; Stripe test mode only |
| 2. Internal alpha | S4 DoD + ADRs done | Team + NaSy run real flows on test Stripe |
| 3. Private beta cohort | Alpha fixes + pricing signed | Invite ~10 real users, test-mode→live billing for cohort, watch metrics F-2 |
| 4. Public launch | Cohort OK + NaSy written approval | Live mode for all; timed for **June EOFY** build-up (start ~May) |
| 5. Post-launch learning | 30 days post-launch | Review against F-2; decide v2 backlog |

**Deploy rule (nasyhub-wide):** no production deploy without NaSy's explicit per-deploy approval; Kai deploys. (Existing team policy, restated here.)

---

## 9. Sprint plan

Cadence: 2-week sprints. Target: public launch start ~May 2027 to catch the June EOFY peak; October (secondary peak per dispatch) used for private beta learnings if timing holds.

| Sprint | Focus | Exit criteria |
|--------|-------|---------------|
| S0 (grooming) | Decisions only | NaSy signs: pricing (Trove), Pro feature list (D-1), entitlement model ADR (A-2), analytics approach (F-3), THORN UX boundary |
| S1 | Foundation | Single pricing config (B-1); feature-flag scaffold (F-4); gate component (C-1); fixture matrix expansion E-1 items 1–7; ADRs A-2/F-3 recorded |
| S2 | Billing | Checkout (B-2) + webhooks (B-3) + test-mode E2E (B-4) on test Stripe; entitlement verify (A-1 local); billing edge cases (B-5) |
| S3 | UX & gating | Paywall + pricing page (C-3, C-4); trigger points (C-2); PWA offline states (C-5); error-state UX (E-4) |
| S4 | Pro features + hardening | D-2 selected v1 features; E-2/E-3 performance + full matrix green; grace/expiry (A-3); regression suite incl. free-path tests (A-4) |
| S5 | Beta & polish | Internal alpha → private beta cohort; metric wiring live (F-1); fix beta findings |
| S6 | Launch prep | Go/no-go review; live-mode cutover; launch runbook (checkout monitoring, webhook alerting, refund handling) |

**Note:** S5–S6 dates are indicative; At the time of writing (Oct 2026) there are ~7 months to the June peak — comfortable, but only if S0 decisions land early. If pricing/feature list drift past S0, S1–S4 compress the wrong way — flag early.

---

## 10. Definition of Done (every story, every sprint)

1. **Code:** implemented on a branch (not main), reviewed, no debug leftovers.
2. **Tests:** `npm test` green — including the full E-1 matrix for anything touching CSV, and the free-path regression tests (A-4).
3. **Types/build:** `tsc --noEmit` zero errors; `npm run build` succeeds.
4. **Docs:** any decision (entitlement, pricing, analytics) recorded as an ADR or updated in the owning planning doc.
5. **Review gate:** VEX review for any user-visible or claim-bearing change; findings severity-ranked and either fixed or explicitly deferred with owner sign-off.
6. **No free-tier regression:** the sign-up-free calculator path works exactly as pre-Pro (automated UI test).
7. **No invented numbers:** any metric in code/UI/copy has a source or an EST label.
8. **Deploy gate:** staged rollout (F-5); nothing to production without NaSy per-deploy approval and Kai executing.

---

## 11. Open questions for S0 (owners)

| # | Question | Owner | Blocks |
|---|----------|-------|--------|
| 1 | Final Pro price + cadence ($29/yr vs $9/report vs other) | Trove + NaSy | B-1, D-1, C-4 |
| 2 | v1 Pro feature list (D-1 cut) | NaSy (Trove costs) | D-2 |
| 3 | Entitlement storage/verify model | Atom | A-1..A-3, C-5 |
| 4 | Analytics approach (privacy-preserving) | NaSy | F-1, F-3 |
| 5 | Webhook runtime (serverless fn, which provider) | Atom | B-3 |
| 6 | Big-file budget (E-3 threshold) | Atom + Honey grooming | E-3 |

---

## 12. Sources

- Repo read at `eccd082` (main, 2026-10-19): `src/`, `dist/`, `package.json`, `README.md`, `src/App.tsx`, `src/lib/**`, `src/test/**`, `public/manifest.json`, `index.html`, git history (`d3d06cf` strip commit, `f43257c` Stripe add).
- `~/.buzz/RESEARCH/VELA_ARCHITECTURE_REVIEW_ATOM.md` — Vela CSV failure modes + papaparse fix.
- `~/.buzz/WORK_LOGS/2026-08-29-vela-strength-consolidated.md` — `fix/vela-w5-papaparse` approval record.
- Kai dispatch 2026-10-19: EOFY June peak (Google Trends), $2K/mo target, SATORI price candidates, target repo/branch.
- Dependencies (not yet read at writing): Atom `ARCHITECTURE-AND-SCOPE.md`, Trove `PRICING-AND-ECONOMICS.md`, THORN `UI-UX-SPEC.md` — same PLANNING folder.

*Planning doc by Honey. Traceable facts only; estimates tagged EST/UNVERIFIED. Pending NaSy approval before build.*
