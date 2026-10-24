/**
 * Scenario currency (roadmap 12e). Display only: it never feeds the calculation,
 * so it stays out of the calc cache key.
 */

export const CURRENCY_CODES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export const DEFAULT_CURRENCY: CurrencyCode = 'USD';

/** Unknown or missing codes fall back to USD, so old scenarios and hostile URLs stay valid. */
export function normalizeCurrency(v: unknown): CurrencyCode {
  return CURRENCY_CODES.includes(v as CurrencyCode) ? (v as CurrencyCode) : DEFAULT_CURRENCY;
}

/** Whole-unit money in the given currency, using the browser locale for separators and symbol placement. */
export function formatMoney0(n: number | undefined, currency: unknown = DEFAULT_CURRENCY): string {
  return Intl.NumberFormat(undefined, { style: 'currency', currency: normalizeCurrency(currency), maximumFractionDigits: 0 }).format(n as number);
}

/** Same, in the active scenario's currency (reads the global app state). */
export function fmtMoney0(n: number | undefined): string {
  return formatMoney0(n, (globalThis as { state?: { currency?: unknown } }).state?.currency);
}

/** Compact thousands label for chart bars, e.g. "$5k" / "€-5k". */
export function fmtMoneyK(n: number): string {
  const symbol = fmtMoney0(0).replace(/[\d\s.,]/g, '');
  return symbol + Math.round(n / 1000) + 'k';
}
