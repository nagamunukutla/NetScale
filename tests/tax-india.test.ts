import { describe, expect, it } from "vitest";
import { computeIndiaNet, compareIndiaRegimes, indiaEmployeePF, indiaHraExemption, indiaTaxOnTaxable } from "../src/lib/tax/india";

describe("India new regime slabs", () => {
  it("is zero tax up to ₹12L taxable (87A rebate)", () => {
    expect(indiaTaxOnTaxable(1200000, "new").incomeTax).toBe(0);
    expect(indiaTaxOnTaxable(500000, "new").incomeTax).toBe(0);
  });
  it("applies marginal relief just above ₹12L", () => {
    // ₹12,01,000: slabs 20,000 + 40,000 + 15% on ₹1,000 = 60,150; relief caps tax at the ₹1,000 excess; +4% cess
    const r = indiaTaxOnTaxable(1201000, "new");
    expect(r.incomeTaxBeforeRebate).toBe(60150);
    expect(r.incomeTax).toBeCloseTo(1040, 2);
  });
  it("taxes ₹24L+ at 30% plus 4% cess", () => {
    // slabs: 4-8L 20,000; 8-12L 40,000; 12-16L 60,000; 16-20L 80,000; 20-24L 100,000; 24-25L 30%*1L=30,000 (cumulative 330,000)
    const r = indiaTaxOnTaxable(2500000, "new");
    expect(r.incomeTaxBeforeRebate).toBe(20000 + 40000 + 60000 + 80000 + 100000 + 30000);
    expect(r.incomeTax).toBeCloseTo(330000 * 1.04, 2);
  });
});

describe("India old regime", () => {
  it("applies 87A rebate up to ₹5L", () => {
    expect(indiaTaxOnTaxable(500000, "old").incomeTax).toBe(0);
  });
  it("taxes ₹10L+ at 30% above the slabs", () => {
    const r = indiaTaxOnTaxable(1000000, "old");
    expect(r.incomeTaxBeforeRebate).toBe(12500 + 100000);
  });
});

describe("India PF and HRA", () => {
  it("PF is 12% of basic, capped at ₹15,000/month wage by default", () => {
    // 40% of 30L = 12L basic → wage capped at 1.8L (15k × 12) → 21,600
    expect(indiaEmployeePF(3000000, 0.4, true)).toBe(21600);
    // Uncapped: 12% of 12L basic
    expect(indiaEmployeePF(3000000, 0.4, false)).toBe(144000);
  });
  it("HRA exemption is the lowest of the three limits", () => {
    const base = { grossAnnual: 1200000, basicPct: 0.4 }; // basic 4.8L
    // HRA 2.4L, rent 3L → rent-10% basic = 2.52L, metro 50% basic = 2.4L → min = 2.4L
    expect(indiaHraExemption({ ...base, hraReceived: 240000, rentPaid: 300000, metro: true })).toBe(240000);
    // non-metro 40% basic = 1.92L is the binding cap
    expect(indiaHraExemption({ ...base, hraReceived: 240000, rentPaid: 300000, metro: false })).toBe(192000);
    expect(indiaHraExemption({ ...base, hraReceived: 0, rentPaid: 300000 })).toBe(0);
  });
});

describe("India regime comparison", () => {
  it("new regime wins for a salary with no deductions", () => {
    const c = compareIndiaRegimes({ grossAnnual: 1200000 });
    expect(c.newRegime.incomeTax).toBe(0);
    expect(c.recommended).toBe("new");
  });
  it("old regime can win with heavy deductions (₹15L, 50% basic, max HRA, NPS, 80D)", () => {
    const c = compareIndiaRegimes({
      grossAnnual: 1500000,
      basicPct: 0.5,
      hraReceived: 375000,
      rentPaid: 500000,
      metro: true,
      other80C: 200000, // EPF (21.6k) + other investments → 80C capped at ₹1.5L
      npsAdditional: 50000,
      medicalPremium: 25000,
    });
    expect(c.oldRegime.incomeTax).toBeLessThan(c.newRegime.incomeTax);
    expect(c.recommended).toBe("old");
  });
  it("take-home = gross − PF − income tax", () => {
    const r = computeIndiaNet({ grossAnnual: 1000000 }, "new");
    expect(r.netAnnual).toBeCloseTo(1000000 - r.employeeContributions - r.incomeTax, 2);
    expect(r.netMonthly).toBeCloseTo(r.netAnnual / 12, 2);
  });
});
