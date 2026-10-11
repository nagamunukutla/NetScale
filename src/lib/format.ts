export function money(amount: number, currency: string): string {
  const locale = currency === "INR" ? "en-IN" : currency === "EUR" ? "es-ES" : "en-US";
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export function pct(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}
