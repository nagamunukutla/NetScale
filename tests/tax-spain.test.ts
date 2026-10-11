import { describe, expect, it } from "vitest";
import { computeSpainNet, spainSocialSecurity, spainWorkReduction, SPAIN_2026 } from "../src/lib/tax/spain";
import { progressiveTax } from "../src/lib/tax/brackets";

describe("progressiveTax", () => {
  const b = [
    { upTo: 100, rate: 0.1 },
    { upTo: 200, rate: 0.2 },
    { upTo: null, rate: 0.3 },
  ];
  it("applies each rate only to its slice", () => {
    expect(progressiveTax(50, b)).toBe(5);
    expect(progressiveTax(150, b)).toBe(10 + 10);
    expect(progressiveTax(250, b)).toBe(10 + 20 + 15);
    expect(progressiveTax(0, b)).toBe(0);
  });
});

describe("Spain work-income reduction (art. 20 LIRPF)", () => {
  it("is 7.302 € up to 14.852 €", () => {
    expect(spainWorkReduction(10000)).toBe(7302);
    expect(spainWorkReduction(14852)).toBe(7302);
  });
  it("is continuous at the bracket boundaries and zero from 19.747,50 €", () => {
    expect(spainWorkReduction(17673.52)).toBeCloseTo(2364.34, 1);
    expect(spainWorkReduction(19747.5)).toBe(0);
    expect(spainWorkReduction(25000)).toBe(0);
    expect(Math.abs(spainWorkReduction(14852.01) - 7302)).toBeLessThan(0.05);
  });
});

describe("Spain social security (employee, 2026)", () => {
  it("applies 6,50 % for permanent and 6,55 % for temporary contracts", () => {
    expect(spainSocialSecurity({ grossAnnual: 30000, region: "common", contract: "permanent" })).toBe(1950);
    expect(spainSocialSecurity({ grossAnnual: 30000, region: "common", contract: "temporary" })).toBe(1965);
  });
  it("caps the monthly base at 5.101,20 €", () => {
    const capped = SPAIN_2026.ss.maxMonthlyBase * 12 * 0.065;
    expect(spainSocialSecurity({ grossAnnual: 200000, region: "common" })).toBeCloseTo(capped, 1);
  });
});

describe("Spain gross-to-net", () => {
  it("computes a Madrid 30.000 € salary (reference: ~4.633 € IRPF)", () => {
    const r = computeSpainNet({ grossAnnual: 30000, region: "madrid", contract: "permanent", payments: 14 });
    expect(r.employeeContributions).toBe(1950);
    expect(r.incomeTax).toBeCloseTo(4632.59, 1);
    expect(r.netAnnual).toBeCloseTo(30000 - 1950 - 4632.59, 1);
    expect(r.netMonthly).toBeCloseTo(r.netAnnual / 12, 2);
  });

  it("Catalonia is more expensive than Madrid for the same salary", () => {
    const madrid = computeSpainNet({ grossAnnual: 40000, region: "madrid" });
    const cat = computeSpainNet({ grossAnnual: 40000, region: "catalonia" });
    expect(cat.incomeTax).toBeGreaterThan(madrid.incomeTax);
  });

  it("pays no IRPF for very low salaries", () => {
    const r = computeSpainNet({ grossAnnual: 12000, region: "madrid" });
    expect(r.incomeTax).toBe(0);
  });

  it("net is monotonically increasing in gross", () => {
    let prev = -Infinity;
    for (let g = 10000; g <= 150000; g += 2500) {
      const n = computeSpainNet({ grossAnnual: g, region: "common" }).netAnnual;
      expect(n).toBeGreaterThan(prev);
      prev = n;
    }
  });

  it("effective rate is below marginal top rate", () => {
    const r = computeSpainNet({ grossAnnual: 100000, region: "madrid" });
    expect(r.effectiveTaxRate).toBeGreaterThan(0.15);
    expect(r.effectiveTaxRate).toBeLessThan(0.47);
  });
});
