"use client";

import { useMemo, useState } from "react";
import { DEFAULT_EARNER, EarnerForm, type EarnerState } from "@/components/EarnerForm";
import { money } from "@/lib/format";
import { compareIndiaRegimes, computeIndiaNet, type IndiaInput } from "@/lib/tax/india";
import { computeSpainNet, netPerPayment, REGIONAL_SCALES, type SpainRegion } from "@/lib/tax/spain";

export default function ComparePage() {
  const [s, setS] = useState<EarnerState>({ ...DEFAULT_EARNER, label: "You", gross: 45000 });

  const indiaInput = (): IndiaInput => ({
    grossAnnual: s.gross,
    basicPct: s.basicPct / 100,
    hraReceived: s.hra,
    rentPaid: s.rent,
    metro: s.metro,
    other80C: s.other80C,
    npsAdditional: s.nps,
    medicalPremium: s.medical,
  });

  const spainRows = useMemo(() => {
    if (s.country !== "ES") return null;
    return (Object.keys(REGIONAL_SCALES) as SpainRegion[]).map((region) => ({
      region,
      label: REGIONAL_SCALES[region].label,
      r: computeSpainNet({ grossAnnual: s.gross, region, contract: s.contract, payments: s.payments }),
    }));
  }, [s.country, s.gross, s.contract, s.payments]);

  const indiaRows = useMemo(() => {
    if (s.country !== "IN") return null;
    return compareIndiaRegimes(indiaInput());
  }, [s]);

  return (
    <>
      <h1>Compare scenarios</h1>
      <p className="lead">Same salary, different rules: Spanish regions and payout structures, or India's two tax regimes.</p>
      <div className="grid grid-2">
        <div className="card">
          <h2>Scenario</h2>
          <EarnerForm value={s} onChange={setS} showRegime={false} />
        </div>

        {spainRows && (
          <div className="card">
            <h2>Spain: region comparison</h2>
            <table>
              <thead>
                <tr><td></td>{spainRows.map((x) => <td key={x.region} className="num"><strong>{x.label}</strong></td>)}</tr>
              </thead>
              <tbody>
                <tr><td>Annual IRPF</td>{spainRows.map((x) => <td key={x.region} className="num">{money(x.r.incomeTax, "EUR")}</td>)}</tr>
                <tr><td>Annual net</td>{spainRows.map((x) => <td key={x.region} className="num">{money(x.r.netAnnual, "EUR")}</td>)}</tr>
                <tr><td>Net / month (12)</td>{spainRows.map((x) => <td key={x.region} className="num">{money(x.r.netAnnual / 12, "EUR")}</td>)}</tr>
                <tr><td>Net per payment (14)</td>{spainRows.map((x) => <td key={x.region} className="num">{money(netPerPayment(x.r, 14), "EUR")}</td>)}</tr>
                <tr><td>Effective IRPF rate</td>{spainRows.map((x) => <td key={x.region} className="num">{(x.r.effectiveTaxRate * 100).toFixed(1)}%</td>)}</tr>
              </tbody>
            </table>
            <p className="muted">Annual totals are the same for 12 and 14 payments; only how the net is paid out changes.</p>
          </div>
        )}

        {indiaRows && (
          <div className="card">
            <h2>India: old vs new regime</h2>
            <table>
              <thead>
                <tr><td></td><td className="num"><strong>New</strong></td><td className="num"><strong>Old</strong></td></tr>
              </thead>
              <tbody>
                <tr><td>Taxable income</td><td className="num">{money(indiaRows.newRegime.breakdown.find((b) => b.kind === "subtotal" && b.label === "Taxable income")?.amount ?? 0, "INR")}</td><td className="num">{money(indiaRows.oldRegime.breakdown.find((b) => b.kind === "subtotal" && b.label === "Taxable income")?.amount ?? 0, "INR")}</td></tr>
                <tr><td>Income tax + cess</td><td className="num">{money(indiaRows.newRegime.incomeTax, "INR")}</td><td className="num">{money(indiaRows.oldRegime.incomeTax, "INR")}</td></tr>
                <tr><td>Annual net</td><td className="num">{money(indiaRows.newRegime.netAnnual, "INR")}</td><td className="num">{money(indiaRows.oldRegime.netAnnual, "INR")}</td></tr>
                <tr><td>Net / month</td><td className="num">{money(indiaRows.newRegime.netMonthly, "INR")}</td><td className="num">{money(indiaRows.oldRegime.netMonthly, "INR")}</td></tr>
              </tbody>
            </table>
            <p style={{ marginTop: 14 }}>
              <span className="badge">Recommended: {indiaRows.recommended === "new" ? "New regime" : "Old regime"}</span>{" "}
              saves {money(Math.abs(indiaRows.newRegimeAdvantage), "INR")} a year.
            </p>
            <p className="muted">Old regime benefits only if your deductions (HRA, 80C, 80CCD(1B), 80D) outweigh the ₹75,000 new-regime standard deduction and its lower slab rates.</p>
            <p className="muted">Single-regime check: {money(computeIndiaNet(indiaInput(), "new").netAnnual, "INR")} under new.</p>
          </div>
        )}
      </div>
    </>
  );
}
