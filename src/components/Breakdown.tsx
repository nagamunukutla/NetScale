import type { NetIncomeResult } from "@/lib/tax/types";
import { money } from "@/lib/format";

export function Breakdown({ result }: { result: NetIncomeResult }) {
  return (
    <div>
      <div className="muted">Net annual take-home</div>
      <div className="big">{money(result.netAnnual, result.currency)}</div>
      <div className="muted">
        {money(result.netMonthly, result.currency)} / month · effective tax {(result.effectiveTaxRate * 100).toFixed(1)}%
      </div>
      <table style={{ marginTop: 14 }}>
        <tbody>
          {result.breakdown.map((l) => (
            <tr key={l.label} className={l.kind}>
              <td>{l.label}</td>
              <td className="num">{money(l.amount, result.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="notes">
        {result.notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </div>
  );
}
