import { describe, expect, it } from "vitest";
import { convert, FALLBACK_RATES, getRates, resetRateCache, type RateTable } from "../src/lib/fx/rates";
import { computeHousehold, splitExpense } from "../src/lib/tax/household";

const table: RateTable = { base: "USD", asOf: "2026-10-11", source: "test", rates: { USD: 1, EUR: 0.5, INR: 80 } };

describe("FX conversion", () => {
  it("converts through the USD base", () => {
    expect(convert(100, "EUR", "USD", table)).toBeCloseTo(200);
    expect(convert(8000, "INR", "EUR", table)).toBeCloseTo(50);
    expect(convert(5, "USD", "USD", table)).toBe(5);
  });
  it("throws for unknown currency", () => {
    expect(() => convert(1, "GBP", "USD", table)).toThrow();
  });
  it("uses fallback when no provider is configured", async () => {
    resetRateCache();
    const t = await getRates({ appId: "" });
    expect(t).toEqual(FALLBACK_RATES);
  });
  it("fetches and caches Open Exchange Rates for 24h", async () => {
    resetRateCache();
    let calls = 0;
    const fetchImpl = (async () => {
      calls++;
      return new Response(JSON.stringify({ timestamp: 1786406400, rates: { EUR: 0.8, INR: 90 } }), { status: 200 });
    }) as unknown as typeof fetch;
    const t1 = await getRates({ appId: "k", fetchImpl, now: 1000 });
    const t2 = await getRates({ appId: "k", fetchImpl, now: 2000 });
    expect(t1.source).toBe("openexchangerates");
    expect(t1.rates.INR).toBe(90);
    expect(t2).toBe(t1);
    expect(calls).toBe(1);
    resetRateCache();
  });
});

describe("Household (glocal couple)", () => {
  it("combines a EUR earner in Madrid with an INR earner in India in EUR", () => {
    const h = computeHousehold(
      [
        { country: "ES", label: "Partner A", spain: { grossAnnual: 40000, region: "madrid", payments: 14 } },
        { country: "IN", label: "Partner B", india: { grossAnnual: 3000000 }, regime: "new" },
      ],
      "EUR",
      table,
    );
    const a = h.earners[0].net.netAnnual;
    const b = h.earners[1].net.netAnnual;
    expect(h.netAnnualBase[0]).toBeCloseTo(a, 2);
    expect(h.netAnnualBase[1]).toBeCloseTo(b / 160, 2); // 80 INR/USD and 0.5 EUR/USD → 160 INR per EUR
    expect(h.combinedNetAnnualBase).toBeCloseTo(h.netAnnualBase[0] + h.netAnnualBase[1], 1);
    expect(h.incomeShare[0] + h.incomeShare[1]).toBeCloseTo(1, 2);
  });
});

describe("expense splitting", () => {
  it("50/50", () => {
    expect(splitExpense(100, { kind: "equal" })).toEqual([50, 50]);
  });
  it("proportional to net income", () => {
    expect(splitExpense(100, { kind: "proportional", netA: 3000, netB: 1000 })).toEqual([75, 25]);
  });
  it("custom fixed amount for partner A, remainder to B", () => {
    expect(splitExpense(100, { kind: "fixed", shareA: 30 })).toEqual([30, 70]);
  });
});
