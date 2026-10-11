"use client";

import { useState } from "react";
import { money } from "@/lib/format";
import { convert, SUPPORTED_CURRENCIES } from "@/lib/fx/rates";
import { useRates } from "@/lib/useRates";

export default function ConvertPage() {
  const rates = useRates();
  const [amount, setAmount] = useState(1000);
  const [from, setFrom] = useState("EUR");
  const [to, setTo] = useState("INR");
  const result = convert(amount || 0, from, to, rates);
  const unit = convert(1, from, to, rates);

  return (
    <>
      <h1>Currency converter</h1>
      <p className="lead">Convert between EUR, INR and USD for cross-border household planning.</p>
      <div className="card" style={{ maxWidth: 560 }}>
        <label>Amount</label>
        <input type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        <div className="row">
          <div>
            <label>From</label>
            <select value={from} onChange={(e) => setFrom(e.target.value)}>
              {SUPPORTED_CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label>To</label>
            <select value={to} onChange={(e) => setTo(e.target.value)}>
              {SUPPORTED_CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="big" style={{ marginTop: 20 }}>{money(result, to)}</div>
        <p className="muted">1 {from} = {unit.toLocaleString("en-US", { maximumFractionDigits: 4 })} {to}</p>
        <p className="muted">Rates as of {rates.asOf} · source: {rates.source}</p>
        {rates.source === "fallback" && (
          <p className="warn">Placeholder rates in use. Set OPEN_EXCHANGE_RATES_APP_ID on the server to load live Open Exchange Rates.</p>
        )}
      </div>
    </>
  );
}
