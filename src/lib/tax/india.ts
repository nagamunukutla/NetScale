import { type Bracket, progressiveTax, round2 } from "./brackets";
import type { BreakdownLine, NetIncomeResult } from "./types";

/**
 * India - salaried employee, FY 2026-27 (AY 2027-28).
 *
 * Sources (checked 2026-10): Budget 2026 made no change to slabs, rebate,
 * standard deduction or surcharge/cess for individuals.
 *  - New regime (default, s.115BAC): nil to ₹4L, 5-30 %; 87A rebate up to ₹60,000 if taxable ≤ ₹12L; std deduction ₹75,000.
 *  - Old regime: nil to ₹2.5L, 5/20/30 %; 87A rebate up to ₹12,500 if taxable ≤ ₹5L; std deduction ₹50,000.
 *  - Health & education cess 4 % on tax + surcharge.
 *
 * Not yet modelled: professional tax, LTA, employer NPS (80CCD(2)) limits, capital gains,
 * senior-citizen slabs, Section 44ADA (freelancers), marginal relief on surcharge.
 */

export const INDIA_FY2026_27 = {
  financialYear: "2026-27",
  cessRate: 0.04,
  pfRate: 0.12,
  pfWageCeilingMonthly: 15000,
  newRegime: {
    brackets: [
      { upTo: 400000, rate: 0 },
      { upTo: 800000, rate: 0.05 },
      { upTo: 1200000, rate: 0.1 },
      { upTo: 1600000, rate: 0.15 },
      { upTo: 2000000, rate: 0.2 },
      { upTo: 2400000, rate: 0.25 },
      { upTo: null, rate: 0.3 },
    ] satisfies Bracket[],
    standardDeduction: 75000,
    rebateThreshold: 1200000,
    rebateMax: 60000,
    surchargeCapRate: 0.25,
  },
  oldRegime: {
    brackets: [
      { upTo: 250000, rate: 0 },
      { upTo: 500000, rate: 0.05 },
      { upTo: 1000000, rate: 0.2 },
      { upTo: null, rate: 0.3 },
    ] satisfies Bracket[],
    standardDeduction: 50000,
    rebateThreshold: 500000,
    rebateMax: 12500,
    surchargeCapRate: 0.37,
  },
  /** Surcharge tiers on income tax (applied to whole tax amount, marginal relief on surcharge not modelled). */
  surcharge: [
    { above: 5000000, rate: 0.1 },
    { above: 10000000, rate: 0.15 },
    { above: 20000000, rate: 0.25 },
    { above: 50000000, rate: 0.37 },
  ],
  deductionCaps: {
    section80C: 150000,
    section80CCD1B: 50000,
    section80D: 25000,
  },
} as const;

export type IndiaRegime = "new" | "old";

export interface IndiaInput {
  /** Annual cash gross salary (CTC excluding employer PF). */
  grossAnnual: number;
  /** Basic salary as a share of gross. Default 0.4. */
  basicPct?: number;
  /** Annual HRA received (old regime only). */
  hraReceived?: number;
  /** Annual rent paid (old regime HRA exemption). */
  rentPaid?: number;
  metro?: boolean;
  /** Apply the ₹15,000/month wage ceiling for PF (common default). */
  pfWageCeiling?: boolean;
  /** Other 80C investments (PPF, ELSS, life insurance, ...). Combined with EPF, capped at ₹1.5L. */
  other80C?: number;
  /** 80CCD(1B) additional NPS contribution, capped at ₹50,000. */
  npsAdditional?: number;
  /** 80D medical insurance premium (self/family), capped at ₹25,000. */
  medicalPremium?: number;
}

export interface IndiaRegimeResult {
  regime: IndiaRegime;
  taxableIncome: number;
  incomeTaxBeforeRebate: number;
  rebate: number;
  surcharge: number;
  cess: number;
  incomeTax: number;
}

const r2 = round2;

/** Employee PF per year (12 % of basic, optionally capped at ₹15,000/month wage). */
export function indiaEmployeePF(grossAnnual: number, basicPct = 0.4, ceiling = true): number {
  const basic = grossAnnual * basicPct;
  const wage = ceiling ? Math.min(basic, INDIA_FY2026_27.pfWageCeilingMonthly * 12) : basic;
  return r2(wage * INDIA_FY2026_27.pfRate);
}

/** Section 10(13A) HRA exemption: lowest of actual HRA, rent − 10 % basic, and 50 %/40 % of basic. */
export function indiaHraExemption(input: IndiaInput): number {
  const basic = input.grossAnnual * (input.basicPct ?? 0.4);
  const hra = input.hraReceived ?? 0;
  const rent = input.rentPaid ?? 0;
  if (hra <= 0 || rent <= 0) return 0;
  const cap = basic * (input.metro ? 0.5 : 0.4);
  return r2(Math.max(0, Math.min(hra, rent - 0.1 * basic, cap)));
}

function surchargeRate(taxableIncome: number, cap: number): number {
  let rate = 0;
  for (const tier of INDIA_FY2026_27.surcharge) {
    if (taxableIncome > tier.above) rate = tier.rate;
  }
  return Math.min(rate, cap);
}

/** Tax on a given taxable income under one regime (rebate with marginal relief, surcharge, cess). */
export function indiaTaxOnTaxable(taxableIncome: number, regime: IndiaRegime): IndiaRegimeResult {
  const cfg = regime === "new" ? INDIA_FY2026_27.newRegime : INDIA_FY2026_27.oldRegime;
  const taxable = Math.max(0, r2(taxableIncome));
  const beforeRebate = progressiveTax(taxable, cfg.brackets);

  let afterRebate: number;
  let rebate = 0;
  if (taxable <= cfg.rebateThreshold) {
    rebate = Math.min(cfg.rebateMax, beforeRebate);
    afterRebate = beforeRebate - rebate;
  } else {
    // Marginal relief: tax can't exceed the amount by which income crosses the threshold.
    afterRebate = Math.min(beforeRebate, taxable - cfg.rebateThreshold);
    rebate = beforeRebate - afterRebate;
  }

  const sRate = surchargeRate(taxable, cfg.surchargeCapRate);
  const surcharge = r2(afterRebate * sRate);
  const cess = r2((afterRebate + surcharge) * INDIA_FY2026_27.cessRate);
  const incomeTax = r2(afterRebate + surcharge + cess);

  return {
    regime,
    taxableIncome: taxable,
    incomeTaxBeforeRebate: beforeRebate,
    rebate: r2(rebate),
    surcharge,
    cess,
    incomeTax,
  };
}

export interface IndiaComparison {
  newRegime: NetIncomeResult;
  oldRegime: NetIncomeResult;
  /** Positive = new regime saves tax vs old. */
  newRegimeAdvantage: number;
  recommended: IndiaRegime;
}

/** Compute take-home under one regime. */
export function computeIndiaNet(input: IndiaInput, regime: IndiaRegime): NetIncomeResult {
  const gross = Math.max(0, input.grossAnnual);
  const basicPct = input.basicPct ?? 0.4;
  const ceiling = input.pfWageCeiling ?? true;
  const pf = indiaEmployeePF(gross, basicPct, ceiling);
  const cfg = regime === "new" ? INDIA_FY2026_27.newRegime : INDIA_FY2026_27.oldRegime;

  const breakdown: BreakdownLine[] = [{ label: "Gross salary (annual)", amount: gross, kind: "income" }];
  let taxableSalary = gross - cfg.standardDeduction;
  breakdown.push({ label: "Standard deduction", amount: -cfg.standardDeduction, kind: "deduction" });

  if (regime === "old") {
    const hra = indiaHraExemption({ ...input, grossAnnual: gross, basicPct });
    const c80C = Math.min(INDIA_FY2026_27.deductionCaps.section80C, pf + (input.other80C ?? 0));
    const c80CCD = Math.min(INDIA_FY2026_27.deductionCaps.section80CCD1B, input.npsAdditional ?? 0);
    const c80D = Math.min(INDIA_FY2026_27.deductionCaps.section80D, input.medicalPremium ?? 0);
    taxableSalary -= hra + c80C + c80CCD + c80D;
    breakdown.push(
      { label: "HRA exemption (10(13A))", amount: -hra, kind: "deduction" },
      { label: "Section 80C (EPF + other, max ₹1.5L)", amount: -c80C, kind: "deduction" },
      { label: "Section 80CCD(1B) NPS (max ₹50K)", amount: -c80CCD, kind: "deduction" },
      { label: "Section 80D medical (max ₹25K)", amount: -c80D, kind: "deduction" },
    );
  }

  const taxable = Math.max(0, r2(taxableSalary));
  const tax = indiaTaxOnTaxable(taxable, regime);
  breakdown.push(
    { label: "Taxable income", amount: taxable, kind: "subtotal" },
    { label: "Income tax on slabs (after rebate)", amount: -r2(tax.incomeTaxBeforeRebate - tax.rebate), kind: "tax" },
    { label: "Surcharge", amount: -tax.surcharge, kind: "tax" },
    { label: "Health & education cess (4%)", amount: -tax.cess, kind: "tax" },
  );

  breakdown.splice(1, 0, { label: "Employee PF (12% of basic)", amount: -pf, kind: "deduction" });
  const netAnnual = r2(gross - pf - tax.incomeTax);
  breakdown.push({ label: "Net annual take-home", amount: netAnnual, kind: "subtotal" });

  const notes = [
    `FY ${INDIA_FY2026_27.financialYear}. Employee PF is deducted from salary under both regimes; it reduces tax only under the old regime (80C).`,
    `Basic assumed at ${Math.round(basicPct * 100)}% of gross${ceiling ? "; PF wage capped at ₹15,000/month" : "; PF on full basic"}.`,
    "Professional tax, LTA and employer NPS are not modelled.",
  ];
  if (regime === "old" && (input.hraReceived ?? 0) > 0 && !input.metro) {
    notes.push("HRA exemption uses the non-metro (40% of basic) limit; set metro for 50%.");
  }

  return {
    country: "IN",
    currency: "INR",
    grossAnnual: gross,
    employeeContributions: pf,
    incomeTax: tax.incomeTax,
    netAnnual,
    netMonthly: r2(netAnnual / 12),
    effectiveTaxRate: gross > 0 ? r2(tax.incomeTax / gross) : 0,
    breakdown,
    notes,
  };
}

/** Side-by-side old vs new regime for the same inputs. */
export function compareIndiaRegimes(input: IndiaInput): IndiaComparison {
  const newRegime = computeIndiaNet(input, "new");
  const oldRegime = computeIndiaNet(input, "old");
  const newRegimeAdvantage = r2(oldRegime.incomeTax - newRegime.incomeTax);
  return {
    newRegime,
    oldRegime,
    newRegimeAdvantage,
    recommended: newRegimeAdvantage >= 0 ? "new" : "old",
  };
}
