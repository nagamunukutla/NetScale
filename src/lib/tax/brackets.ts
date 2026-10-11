/**
 * A progressive bracket. `upTo` is the cumulative upper bound of the bracket
 * (exclusive of the next one); `null` means "no upper bound".
 * `rate` is a decimal (0.19 = 19%).
 */
export interface Bracket {
  upTo: number | null;
  rate: number;
}

/**
 * Tax due on `amount` under progressive brackets. Each rate applies only to the
 * slice of `amount` that falls inside its bracket.
 */
export function progressiveTax(amount: number, brackets: readonly Bracket[]): number {
  if (amount <= 0) return 0;
  let tax = 0;
  let lower = 0;
  for (const b of brackets) {
    const upper = b.upTo ?? Number.POSITIVE_INFINITY;
    if (amount <= lower) break;
    const slice = Math.min(amount, upper) - lower;
    if (slice > 0) tax += slice * b.rate;
    lower = upper;
  }
  return round2(tax);
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
