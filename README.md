# NetScale

Financial management for people and households. NetScale turns gross salary into **exact net pay**
using country-specific tax rules, then (in later phases) routes that net income into budgets, shared
ledgers and tax-saving strategies.

This repository currently contains **Phase 1 (MVP web tool)** of the product requirements:

- Single & partner gross-to-net engine for **Spain** and **India**
- Multi-currency conversion (EUR / INR / USD) and a household view for cross-border couples
- Basic web comparison tool (Madrid vs Catalonia vs common regime; India old vs new regime)

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000 (binds 0.0.0.0)
npm test           # tax engine + FX unit tests (Vitest)
npm run typecheck
npm run build
```

Optional live FX: set `OPEN_EXCHANGE_RATES_APP_ID` in `.env.local`. Without it the app uses a
**placeholder** rate table, labelled as such in the UI.

## Project layout

```
src/lib/tax/
  brackets.ts     progressive bracket maths (shared)
  spain.ts        Spain employee engine: SS contributions, IRPF state + regional scales, work reduction
  india.ts        India engine: new vs old regime, 87A rebate + marginal relief, surcharge, cess, PF, HRA, 80C/80CCD(1B)/80D
  household.ts    combine earners in different currencies; expense split (50/50, proportional, fixed)
src/lib/fx/rates.ts   conversion via USD base; Open Exchange Rates adapter with 24h cache
src/app/              Next.js App Router pages: /, /calculator, /compare, /convert, /api/fx
tests/                Vitest suites (28 tests)
```

## Tax rules implemented

All rule constants live in one place per country (`SPAIN_2026`, `INDIA_FY2026_27`) so they can be
updated each year without touching the logic.

### Spain (tax year 2026, employee / cuenta ajena)

- **Social Security (employee):** contingencias comunes 4,70 % + desempleo 1,55 % (indefinido) or 1,60 %
  (temporal) + formación profesional 0,10 % + MEI 0,15 %. Monthly base = annual gross / 12, capped at
  €5.101,20 (floor €1.424,40 as a generic default).
- **Work expenses:** €2.000 general deduction.
- **Work-income reduction (art. 20 LIRPF):** €7.302 up to €14.852 net, tapering to zero at €19.747,50.
- **IRPF:** state scale 9,5 / 12 / 15 / 18,5 / 22,5 / 24,5 % plus a regional scale.
  - Madrid (8,5 → 20,5 %), Catalonia (9,5 → 25,5 %), and a common-regime default (state scale) for other regions.
  - Personal minimum (€5.550) applied as a tax credit, as in art. 63 LIRPF.
- **Payouts:** 12 or 14 payments. Annual totals are identical; the UI shows net per payment.

### India (FY 2026-27, salaried)

- **New regime (default):** nil to ₹4L, then 5 → 30 % slabs; ₹75,000 standard deduction; 87A rebate up to ₹60,000 for taxable income ≤ ₹12L with marginal relief just above.
- **Old regime:** nil to ₹2.5L, then 5 / 20 / 30 %; ₹50,000 standard deduction; 87A rebate up to ₹12,500 for taxable income ≤ ₹5L.
- **Old-regime deductions:** HRA exemption (lowest of actual HRA, rent − 10 % basic, 50 % / 40 % of basic), 80C (EPF + other, cap ₹1.5L), 80CCD(1B) NPS (cap ₹50K), 80D (cap ₹25K).
- **Employee PF:** 12 % of basic, with the ₹15,000/month wage ceiling as the default (toggleable in the engine).
- Surcharge tiers and 4 % health & education cess.

### Households

- Each earner is computed in their own country and currency, converted to a base currency (EUR, INR or USD), and combined.
- Income share per earner feeds the **proportional** expense-split mode.

## Sources

- Spain: Gabinete Laboral and calculadoraslaborales.com (2026 SS rates and bases; Orden PJC/297/2026, RDL 3/2026); calculalaboral.net and finect (IRPF state scale); netosueldo.es and civislex (art. 20 reduction); taxdown.es and frihet.io (Madrid scale, Ley 13/2023); guiafiscal.es and calculatuirpf.com (Catalonia, DL 5/2025).
- India: cleartax.in, bajajfinserv.in, indianpaycalculator.in, wealthmunshi.com, and Economic Times (FY 2026-27 slabs, 87A, standard deduction; Budget 2026 made no changes to individual rates).

**Verify before relying on these figures.** Tax rules change, and some sources disagree on minor values.

## Known gaps (tracked for later phases)

| Area | Status |
|---|---|
| Andalusia / other bespoke regional scales | Common-regime default used. The sources disagreed, so the scale was not verified. |
| Spain Beckham law, pension / insurance deductions, family & disability minimums | Not modelled (Phase 3 tax optimizer). |
| Spain self-employed (autónomo), India Section 44ADA freelancers | Not modelled (PRD Module 1; next iteration). |
| Withholding (retención) vs annual liability | Engine estimates annual liability only. |
| Live FX | Adapter is in place; needs `OPEN_EXCHANGE_RATES_APP_ID`. Placeholder rates otherwise. |
| Persistence, auth, partner invite/QR link, ledgers, budgeting 50/30/20 | Phase 2+ (no database yet). |
| Open banking, OCR | Phase 3. |
| US / UK / LatAm engines | Phase 4. |

## Compliance notes

The product targets GDPR (Spain / EU) and DPDP Act (India) compliance. The current MVP stores no personal data: calculations run in the browser and the server only proxies FX rates. Treat any future persistence of salary data as in-scope for AES-256 at rest, TLS 1.3 in transit, and a data-processing review.
