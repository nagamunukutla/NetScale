import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "NetScale - exact take-home pay for Spain and India",
  description: "Gross-to-net salary calculator for Spain and India, single or dual-income households, with multi-currency conversion.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link href="/" className="brand">NetScale</Link>
          <nav>
            <Link href="/calculator">Calculator</Link>
            <Link href="/compare">Compare</Link>
            <Link href="/convert">Convert</Link>
          </nav>
        </header>
        <main className="container">{children}</main>
        <footer className="site-footer">
          Estimates only, not tax advice. Tax year 2026 (Spain) and FY 2026-27 (India). Verify with a qualified advisor.
        </footer>
      </body>
    </html>
  );
}
