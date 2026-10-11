import { type Bracket, progressiveTax, round2 } from "./brackets";
import type { BreakdownLine, NetIncomeResult } from "./types";

/**
 * Spain - employee (asalariado / cuenta ajena), Régimen General, tax year 2026.
 *
 * Sources (checked 2026-10):
 *  - SS rates & max base 5.101,20 €/month (Orden PJC/297/2026; RDL 3/2026 for MEI).
 *  - IRPF state scale 9.5/12/15/18.5/22.5/24.5 % and personal minimum 5.550 €.
 *  - Work-income reduction (art. 20 LIRPF): 7.302 € up to 14.852 €, zero from 19.747,50 €.
 *  - Madrid autonomic scale (Ley 13/2023): 8.5 → 20.5 %.
 *  - Catalonia autonomic scale (DL 5/2025): 9.5 → 25.5 %.
 *
 * Not yet modelled: Beckham law, pension / insurance deductions, family minimums,
 * disability, self-employed (autónomo), withholding (retención) vs. annual liability.
 */

export const SPAIN_2026 = {
  taxYear: 2026,
  ss: {
    commonContingencies: 0.047,
    unemploymentPermanent: 0.0155,
    unemploymentTemporary: 0.016,
    professionalTraining: 0.001,
    mei: 0.0015,
    maxMonthlyBase: 5101.2,
    /** Floor for the general contribution groups 4-7 (used as a default; group-specific floors vary). */
    minMonthlyBase: 1424.4,
  },
  generalExpenses: 2000,
  personalMinimum: 5550,
  workReduction: { fullUpTo: 14852, fullAmount: 7302, zeroFrom: 19747.5 },
} as const;

/** State part of IRPF (the other half of the total rate). */
const STATE_SCALE: Bracket[] = [
  { upTo: 12450, rate: 0.095 },
  { upTo: 20200, rate: 0.12 },
  { upTo: 35200, rate: 0.15 },
  { upTo: 60000, rate: 0.185 },
  { upTo: 300000, rate: 0.225 },
  { upTo: null, rate: 0.245 },
];

export const REGIONAL_SCALES = {
  /** Common-regime default: regions without a bespoke scale use the state scale. */
  common: {
    label: "Common regime (default scale)",
    brackets: STATE_SCALE,
  },
  madrid: {
    label: "Comunidad de Madrid",
    brackets: [
      { upTo: 13362.22, rate: 0.085 },
      { upTo: 19004.63, rate: 0.107 },
      { upTo: 35425.68, rate: 0.128 },
      { upTo: 57320.4, rate: 0.174 },
      { upTo: null, rate: 0.205 },
    ] satisfies Bracket[],
  },
  catalonia: {
    label: "Cataluña",
    brackets: [
      { upTo: 12500, rate: 0.095 },
      { upTo: 22000, rate: 0.125 },
      { upTo: 33000, rate: 0.16 },
      { upTo: 53000, rate: 0.19 },
      { upTo: 90000, rate: 0.215 },
      { upTo: 120000, rate: 0.235 },
      { upTo: 175000, rate: 0.245 },
      { upTo: null, rate: 0.255 },
    ] satisfies Bracket[],
  },
} as const;

export type SpainRegion = keyof typeof REGIONAL_SCALES;
export type SpainContract = "permanent" | "temporary";
export type SpainPayments = 12 | 14;

export interface SpainInput {
  grossAnnual: number;
  region: SpainRegion;
  contract?: SpainContract;
  /** 12 = salary split evenly; 14 = two extra pagas (prorated in the SS base). */
  payments?: SpainPayments;
}

/** Work-income reduction (reducción por rendimientos del trabajo), art. 20 LIRPF. */
export function spainWorkReduction(netWorkIncome: number): number {
  const { fullUpTo, fullAmount, zeroFrom } = SPAIN_2026.workReduction;
  if (netWorkIncome >= zeroFrom) return 0;
  if (netWorkIncome <= fullUpTo) return fullAmount;
  if (netWorkIncome <= 17673.52) return round2(fullAmount - 1.75 * (netWorkIncome - fullUpTo));
  return round2(2364.34 - 1.14 * (netWorkIncome - 17673.52));
}

/** Employee social security contributions (annual). Base is the monthly-equivalent salary, capped. */
export function spainSocialSecurity(input: SpainInput): number {
  const { ss } = SPAIN_2026;
  const rate =
    (input.contract ?? "permanent") === "permanent"
      ? ss.commonContingencies + ss.unemploymentPermanent + ss.professionalTraining + ss.mei
      : ss.commonContingencies + ss.unemploymentTemporary + ss.professionalTraining + ss.mei;
  // Extra pagas are prorated over 12 months for contribution purposes, so the monthly base is annual / 12 regardless of payments.
  const monthlyBase = Math.min(Math.max(input.grossAnnual / 12, ss.minMonthlyBase), ss.maxMonthlyBase);
  return round2(monthlyBase * 12 * rate);
}

/** Cuota íntegra minus cuota of the personal minimum (art. 63 LIRPF, applied as a credit). */
function scaleTaxAfterMinimum(base: number, brackets: readonly Bracket[]): number {
  const gross = progressiveTax(base, brackets);
  const credit = progressiveTax(Math.min(SPAIN_2026.personalMinimum, base), brackets);
  return Math.max(0, round2(gross - credit));
}

export function computeSpainNet(input: SpainInput): NetIncomeResult {
  const payments = input.payments ?? 14;
  const contract = input.contract ?? "permanent";
  const region = REGIONAL_SCALES[input.region];
  const gross = Math.max(0, input.grossAnnual);

  const socialSecurity = spainSocialSecurity({ ...input, grossAnnual: gross, contract });
  const netWorkIncome = Math.max(0, gross - socialSecurity - SPAIN_2026.generalExpenses);
  const reduction = spainWorkReduction(netWorkIncome);
  const taxableBase = Math.max(0, round2(netWorkIncome - reduction));

  const stateTax = scaleTaxAfterMinimum(taxableBase, STATE_SCALE);
  const regionalTax = scaleTaxAfterMinimum(taxableBase, region.brackets);
  const incomeTax = round2(stateTax + regionalTax);

  const netAnnual = round2(gross - socialSecurity - incomeTax);

  const breakdown: BreakdownLine[] = [
    { label: "Gross salary (annual)", amount: gross, kind: "income" },
    { label: "Social Security (employee)", amount: -socialSecurity, kind: "deduction" },
    { label: "General work expenses", amount: -SPAIN_2026.generalExpenses, kind: "deduction" },
    { label: "Work-income reduction (art. 20)", amount: -reduction, kind: "deduction" },
    { label: "Taxable base (base liquidable general)", amount: taxableBase, kind: "subtotal" },
    { label: "IRPF - state part", amount: -stateTax, kind: "tax" },
    { label: `IRPF - ${region.label}`, amount: -regionalTax, kind: "tax" },
    { label: "Net annual take-home", amount: netAnnual, kind: "subtotal" },
  ];

  const notes = [
    `Tax year ${SPAIN_2026.taxYear}. Estimate of annual liability; actual payroll withholding (retención) can differ.`,
    `Payout structure: ${payments} payments. Annual net is identical; per-payment net = annual net / ${payments}.`,
    contract === "temporary"
      ? "Temporary contract: unemployment contribution 1,60% (vs 1,55%)."
      : "Permanent contract: unemployment contribution 1,55%.",
    "Beckham law, pension plan deductions, family/disability minimums are not included.",
  ];
  if (input.region === "common") {
    notes.push("Regional scale not bespoke for this region; default common scale is used (verify with your Comunidad).");
  }

  return {
    country: "ES",
    currency: "EUR",
    grossAnnual: gross,
    employeeContributions: socialSecurity,
    incomeTax,
    netAnnual,
    netMonthly: round2(netAnnual / 12),
    effectiveTaxRate: gross > 0 ? round2(incomeTax / gross) : 0,
    breakdown,
    notes,
  };
}

/** Net per payment for a given payout structure. */
export function netPerPayment(result: NetIncomeResult, payments: SpainPayments): number {
  return round2(result.netAnnual / payments);
}
