"use client";

import { useMemo, useState } from "react";
import { Breakdown } from "@/components/Breakdown";
import { DEFAULT_EARNER, EarnerForm, toEarnerInput, type EarnerState } from "@/components/EarnerForm";
import { money, pct } from "@/lib/format";
import { convert, SUPPORTED_CURRENCIES } from "@/lib/fx/rates";
import { computeEarner, computeHousehold, splitExpense } from "@/lib/tax/household";
import { useRates } from "@/lib/useRates";

export default function CalculatorPage() {
  const [mode, setMode] = useState<"single" | "couple">("single");
  const [me, setMe] = useState<EarnerState>({ ...DEFAULT_EARNER, label: "You" });
  const [partner, setPartner] = useState<EarnerState>({
    ...DEFAULT_EARNER,
    label: "Partner",
    country: "IN",
    gross: 2400000,
    regime: "new",
  });
  const [base, setBase] = useState<string>("EUR");
  const [expense, setExpense] = useState<number>(1200);
  const [splitMode, setSplitMode] = useState<"equal" | "proportional" | "fixed">("proportional");
  const [fixedA, setFixedA] = useState<number>(600);
  const rates = useRates();

  const single = useMemo(() => computeEarner(toEarnerInput(me)), [me]);

  const household = useMemo(() => {
    if (mode !== "couple") return null;
    return computeHousehold([toEarnerInput(me), toEarnerInput(partner)], base, rates);
  }, [mode, me, partner, base, rates]);

  const split = useMemo(() => {
    if (!household) return null;
    const [a, b] = household.netAnnualBase;
    const mode2 =
      splitMode === "equal"
        ? ({ kind: "equal" } as const)
        : splitMode === "proportional"
          ? ({ kind: "proportional", netA: a, netB: b } as const)
          : ({ kind: "fixed", shareA: fixedA } as const);
    return splitExpense(expense, mode2);
  }, [household, splitMode, fixedA, expense]);

  return (
    <>
      <h1>Net pay calculator</h1>
      <p className="lead">Exact take-home pay from country-specific tax rules. Estimates, not tax advice.</p>

      <div className="tabs" role="tablist">
        <button className={mode === "single" ? "active" : ""} onClick={() => setMode("single")}>Single</button>
        <button className={mode === "couple" ? "active" : ""} onClick={() => setMode("couple")}>Couple</button>
      </div>

      {mode === "single" ? (
        <div className="grid grid-2">
          <div className="card">
            <h2>Your details</h2>
            <EarnerForm value={me} onChange={setMe} />
          </div>
          <div className="card">
            <h2>Your take-home</h2>
            <Breakdown result={single} />
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-2">
            <div className="card">
              <h2>Partner A</h2>
              <EarnerForm value={me} onChange={setMe} />
            </div>
            <div className="card">
              <h2>Partner B</h2>
              <EarnerForm value={partner} onChange={setPartner} />
            </div>
          </div>

          <div className="card" style={{ marginTop: 18 }}>
            <div className="row">
              <div>
                <label>Household base currency</label>
                <select value={base} onChange={(e) => setBase(e.target.value)}>
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="muted" style={{ alignSelf: "end" }}>
                FX as of {rates.asOf} ({rates.source === "fallback" ? "placeholder rates - set OPEN_EXCHANGE_RATES_APP_ID for live" : "Open Exchange Rates"})
              </div>
            </div>
          </div>

          {household && (
            <div className="grid grid-3" style={{ marginTop: 18 }}>
              <div className="card">
                <div className="muted">Combined net, monthly</div>
                <div className="big">{money(household.combinedNetMonthlyBase, base)}</div>
                <div className="muted">{money(household.combinedNetAnnualBase, base)} per year</div>
              </div>
              {household.earners.map((e, i) => (
                <div className="card" key={e.label}>
                  <div className="muted">{e.label} ({e.net.currency})</div>
                  <div className="big">{money(e.net.netMonthly, e.net.currency)}</div>
                  <div className="muted">
                    ≈ {money(household.netAnnualBase[i] / 12, base)} / month · share {pct(household.incomeShare[i])}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-2" style={{ marginTop: 18 }}>
            <div className="card">
              <h2>Split a shared expense</h2>
              <label>Monthly shared expense ({base})</label>
              <input type="number" min={0} value={expense} onChange={(e) => setExpense(Number(e.target.value) || 0)} />
              <label>Split rule</label>
              <select value={splitMode} onChange={(e) => setSplitMode(e.target.value as typeof splitMode)}>
                <option value="proportional">Proportional to net income</option>
                <option value="equal">50 / 50</option>
                <option value="fixed">Fixed amount for Partner A</option>
              </select>
              {splitMode === "fixed" && (
                <>
                  <label>Partner A pays ({base})</label>
                  <input type="number" min={0} value={fixedA} onChange={(e) => setFixedA(Number(e.target.value) || 0)} />
                </>
              )}
              {split && household && (
                <p style={{ marginTop: 14 }}>
                  <strong>{household.earners[0].label}:</strong> {money(split[0], base)} ·{" "}
                  <strong>{household.earners[1].label}:</strong> {money(split[1], base)}
                </p>
              )}
            </div>
            <div className="card">
              <h2>Currency conversion</h2>
              {household && household.earners.map((e, i) => (
                <p key={e.label} className="muted" style={{ margin: "4px 0" }}>
                  {e.label}: {money(e.net.netAnnual, e.net.currency)} = {money(household.netAnnualBase[i], base)} per year
                </p>
              ))}
              <p className="muted">Each partner's net is converted once at the rate above; all totals use the same rate.</p>
              {(() => {
                const sample = convert(1000, "EUR", base, rates);
                return <p className="muted">Reference: €1,000 = {money(sample, base)}</p>;
              })()}
            </div>
          </div>
        </>
      )}
    </>
  );
}
