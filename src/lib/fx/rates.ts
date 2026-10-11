/**
 * Currency rates and conversion.
 *
 * Rates are stored against a USD base: `rates[X]` = units of X per 1 USD.
 * The FALLBACK table is a PLACEHOLDER used when no live provider is configured.
 * It is NOT a live rate and must be refreshed before anything user-facing relies on it.
 */

export interface RateTable {
  base: "USD";
  /** ISO date (YYYY-MM-DD) the rates refer to. */
  asOf: string;
  /** "openexchangerates" | "fallback" */
  source: string;
  rates: Record<string, number>;
}

export const SUPPORTED_CURRENCIES = ["EUR", "INR", "USD"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const FALLBACK_RATES: RateTable = {
  base: "USD",
  asOf: "PLACEHOLDER",
  source: "fallback",
  rates: { USD: 1, EUR: 0.86, INR: 88 },
};

/** Convert `amount` from one currency to another via the USD base. */
export function convert(amount: number, from: string, to: string, table: RateTable): number {
  if (from === to) return amount;
  const rFrom = table.rates[from];
  const rTo = table.rates[to];
  if (!rFrom || !rTo) throw new Error(`No rate for ${from} or ${to}`);
  return (amount / rFrom) * rTo;
}

/**
 * Open Exchange Rates adapter. Requires OPEN_EXCHANGE_RATES_APP_ID.
 * Results are cached in-process for 24h ("daily caching" per PRD).
 */
const DAY_MS = 24 * 60 * 60 * 1000;
let cache: { at: number; table: RateTable } | null = null;

export async function getRates(opts: { now?: number; fetchImpl?: typeof fetch; appId?: string } = {}): Promise<RateTable> {
  const now = opts.now ?? Date.now();
  if (cache && now - cache.at < DAY_MS) return cache.table;

  const appId = opts.appId ?? process.env.OPEN_EXCHANGE_RATES_APP_ID;
  if (!appId) return FALLBACK_RATES;

  const f = opts.fetchImpl ?? fetch;
  const res = await f(
    `https://openexchangerates.org/api/latest.json?app_id=${encodeURIComponent(appId)}&symbols=EUR,INR,USD`,
  );
  if (!res.ok) return cache?.table ?? FALLBACK_RATES;
  const body = (await res.json()) as { timestamp: number; rates: Record<string, number> };
  const table: RateTable = {
    base: "USD",
    asOf: new Date(body.timestamp * 1000).toISOString().slice(0, 10),
    source: "openexchangerates",
    rates: { USD: 1, EUR: body.rates.EUR, INR: body.rates.INR },
  };
  cache = { at: now, table };
  return table;
}

export function resetRateCache(): void {
  cache = null;
}
