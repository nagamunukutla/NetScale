"use client";

import type { SpainPayments, SpainRegion, SpainContract } from "@/lib/tax/spain";
import { REGIONAL_SCALES } from "@/lib/tax/spain";
import type { IndiaRegime } from "@/lib/tax/india";
import type { EarnerInput } from "@/lib/tax/household";

export interface EarnerState {
  country: "ES" | "IN";
  label: string;
  gross: number;
  // Spain
  region: SpainRegion;
  contract: SpainContract;
  payments: SpainPayments;
  // India
  regime: IndiaRegime;
  basicPct: number;
  hra: number;
  rent: number;
  metro: boolean;
  other80C: number;
  nps: number;
  medical: number;
}

export const DEFAULT_EARNER: EarnerState = {
  country: "ES",
  label: "Earner",
  gross: 40000,
  region: "madrid",
  contract: "permanent",
  payments: 14,
  regime: "new",
  basicPct: 40,
  hra: 0,
  rent: 0,
  metro: true,
  other80C: 0,
  nps: 0,
  medical: 0,
};

export function toEarnerInput(s: EarnerState): EarnerInput {
  if (s.country === "ES") {
    return {
      country: "ES",
      label: s.label,
      spain: { grossAnnual: s.gross, region: s.region, contract: s.contract, payments: s.payments },
    };
  }
  return {
    country: "IN",
    label: s.label,
    regime: s.regime,
    india: {
      grossAnnual: s.gross,
      basicPct: s.basicPct / 100,
      hraReceived: s.hra,
      rentPaid: s.rent,
      metro: s.metro,
      other80C: s.other80C,
      npsAdditional: s.nps,
      medicalPremium: s.medical,
    },
  };
}

function num(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function EarnerForm({
  value,
  onChange,
  showRegime = true,
}: {
  value: EarnerState;
  onChange: (v: EarnerState) => void;
  showRegime?: boolean;
}) {
  const set = <K extends keyof EarnerState>(k: K, v: EarnerState[K]) => onChange({ ...value, [k]: v });
  return (
    <div>
      <label>Label</label>
      <input value={value.label} onChange={(e) => set("label", e.target.value)} />

      <label>Country of employment</label>
      <select value={value.country} onChange={(e) => set("country", e.target.value as "ES" | "IN")}>
        <option value="ES">Spain (EUR)</option>
        <option value="IN">India (INR)</option>
      </select>

      <label>Annual gross salary ({value.country === "ES" ? "EUR" : "INR"})</label>
      <input type="number" min={0} value={value.gross} onChange={(e) => set("gross", num(e.target.value))} />

      {value.country === "ES" ? (
        <>
          <label>Autonomous community</label>
          <select value={value.region} onChange={(e) => set("region", e.target.value as SpainRegion)}>
            {Object.entries(REGIONAL_SCALES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          <div className="row">
            <div>
              <label>Contract</label>
              <select value={value.contract} onChange={(e) => set("contract", e.target.value as SpainContract)}>
                <option value="permanent">Permanent (indefinido)</option>
                <option value="temporary">Temporary</option>
              </select>
            </div>
            <div>
              <label>Payments per year</label>
              <select value={value.payments} onChange={(e) => set("payments", Number(e.target.value) as SpainPayments)}>
                <option value={14}>14 (2 extra pagas)</option>
                <option value={12}>12</option>
              </select>
            </div>
          </div>
        </>
      ) : (
        <>
          {showRegime && (
            <>
              <label>Tax regime</label>
              <select value={value.regime} onChange={(e) => set("regime", e.target.value as IndiaRegime)}>
                <option value="new">New regime (default)</option>
                <option value="old">Old regime</option>
              </select>
            </>
          )}
          <div className="row">
            <div>
              <label>Basic salary (% of gross)</label>
              <input type="number" min={0} max={100} value={value.basicPct} onChange={(e) => set("basicPct", num(e.target.value))} />
            </div>
            <div>
              <label>Metro city (HRA 50%)</label>
              <label className="check" style={{ margin: "8px 0 0" }}>
                <input type="checkbox" checked={value.metro} onChange={(e) => set("metro", e.target.checked)} /> Yes
              </label>
            </div>
          </div>
          <div className="row">
            <div>
              <label>Annual HRA received</label>
              <input type="number" min={0} value={value.hra} onChange={(e) => set("hra", num(e.target.value))} />
            </div>
            <div>
              <label>Annual rent paid</label>
              <input type="number" min={0} value={value.rent} onChange={(e) => set("rent", num(e.target.value))} />
            </div>
          </div>
          <div className="row">
            <div>
              <label>Other 80C investments</label>
              <input type="number" min={0} value={value.other80C} onChange={(e) => set("other80C", num(e.target.value))} />
            </div>
            <div>
              <label>NPS 80CCD(1B)</label>
              <input type="number" min={0} value={value.nps} onChange={(e) => set("nps", num(e.target.value))} />
            </div>
          </div>
          <label>Medical insurance premium (80D)</label>
          <input type="number" min={0} value={value.medical} onChange={(e) => set("medical", num(e.target.value))} />
        </>
      )}
    </div>
  );
}
