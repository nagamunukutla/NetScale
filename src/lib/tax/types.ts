export type Country = "ES" | "IN";

/** Result of a gross-to-net computation for one earner, in the earner's local currency. */
export interface NetIncomeResult {
  country: Country;
  currency: "EUR" | "INR";
  /** Annual gross salary (cash, before any deduction). */
  grossAnnual: number;
  /** Total employee-side deductions that reduce gross to net (social security / PF / income tax). */
  employeeContributions: number;
  incomeTax: number;
  /** Annual take-home pay. */
  netAnnual: number;
  /** Average monthly take-home (netAnnual / 12). */
  netMonthly: number;
  effectiveTaxRate: number;
  /** Human-readable line items for the UI breakdown. */
  breakdown: BreakdownLine[];
  /** Non-blocking notes (assumptions, caveats). */
  notes: string[];
}

export interface BreakdownLine {
  label: string;
  amount: number;
  /** Positive = adds to income, negative = deduction. Used only for display. */
  kind?: "income" | "deduction" | "tax" | "subtotal";
}
