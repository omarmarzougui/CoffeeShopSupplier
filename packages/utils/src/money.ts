export function formatMinorUnits(amount: number, currency = "TND"): string {
  const major = Math.trunc(Math.abs(amount) / 100);
  const minor = Math.abs(amount) % 100;
  const sign = amount < 0 ? "-" : "";
  return `${sign}${major}.${String(minor).padStart(2, "0")} ${currency}`;
}
