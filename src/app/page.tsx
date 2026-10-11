import Link from "next/link";

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>Know your exact take-home pay.</h1>
        <p className="lead">
          NetScale computes net monthly income from country-specific tax rules for Spain and India, for individuals or
          two-income households, including partners earning in different currencies.
        </p>
        <Link className="cta" href="/calculator">Calculate my net pay</Link>
      </section>
      <section className="grid grid-3" style={{ marginTop: 30 }}>
        <div className="card">
          <span className="badge">Spain</span>
          <h3>IRPF + Social Security</h3>
          <p className="muted">Employee contributions with 2026 caps, state + Madrid / Catalonia regional scales, the work-income reduction and the personal minimum.</p>
        </div>
        <div className="card">
          <span className="badge">India</span>
          <h3>Old vs New regime</h3>
          <p className="muted">Side-by-side tax under both regimes, 87A rebate with marginal relief, HRA, 80C, 80CCD(1B), 80D and EPF.</p>
        </div>
        <div className="card">
          <span className="badge">Households</span>
          <h3>Couples &amp; cross-border</h3>
          <p className="muted">Combine two earners in different countries and currencies into one base-currency household net, with income shares for splitting bills.</p>
        </div>
      </section>
      <p className="muted" style={{ marginTop: 28 }}>
        Phase 1 MVP. Not yet included: self-employed (autónomo / 44ADA), Beckham law, Andalusia-specific scale, live FX without an API key.
      </p>
    </>
  );
}
