import { round2 } from "./brackets";
import { computeIndiaNet, type IndiaInput, type IndiaRegime } from "./india";
import { computeSpainNet, type SpainInput } from "./spain";
import type { NetIncomeResult } from "./types";
import { convert, type RateTable } from "../fx/rates";

export type EarnerInput =
  | { country: "ES"; spain: SpainInput; label?: string }
  | { country: "IN"; india: IndiaInput; regime?: IndiaRegime; label?: string };

export interface EarnerResult {
  label: string;
  net: NetIncomeResult;
}

export interface HouseholdResult {
  baseCurrency: string;
  earners: EarnerResult[];
  /** Each earner's net converted to base currency (annual). */
  netAnnualBase: number[];
  combinedNetAnnualBase: number;
  combinedNetMonthlyBase: number;
  /** Share of combined net per earner (0..1). Basis for proportional split ratios. */
  incomeShare: number[];
  fxAsOf: string;
  fxSource: string;
}

export function computeEarner(e: EarnerInput): NetIncomeResult {
  if (e.country === "ES") return computeSpainNet(e.spain);
  return computeIndiaNet(e.india, e.regime ?? "new");
}

/** Combine one or two earners into a household view in a chosen base currency. */
export function computeHousehold(
  earners: EarnerInput[],
  baseCurrency: string,
  rates: RateTable,
): HouseholdResult {
  const results = earners.map((e, i) => ({
    label: e.label ?? `Earner ${i + 1}`,
    net: computeEarner(e),
  }));
  const netAnnualBase = results.map((r) => round2(convert(r.net.netAnnual, r.net.currency, baseCurrency, rates)));
  const combined = round2(netAnnualBase.reduce((a, b) => a + b, 0));
  return {
    baseCurrency,
    earners: results,
    netAnnualBase,
    combinedNetAnnualBase: combined,
    combinedNetMonthlyBase: round2(combined / 12),
    incomeShare: netAnnualBase.map((n) => (combined > 0 ? round2(n / combined) : 0)),
    fxAsOf: rates.asOf,
    fxSource: rates.source,
  };
}

/**
 * Split a shared expense between two partners. Modes match the PRD:
 * 50/50, proportional to net income, or a custom fixed amount.
 */
export function splitExpense(
  amount: number,
  mode: { kind: "equal" } | { kind: "proportional"; netA: number; netB: number } | { kind: "fixed"; shareA: number },
): [number, number] {
  if (mode.kind === "equal") return [round2(amount / 2), round2(amount - amount / 2)];
  if (mode.kind === "proportional") {
    const total = mode.netA + mode.netB;
    const a = total > 0 ? round2((amount * mode.netA) / total) : round2(amount / 2);
    return [a, round2(amount - a)];
  }
  const a = Math.min(Math.max(mode.shareA, 0), amount);
  return [round2(a), round2(amount - a)];
}
