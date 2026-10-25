export const fmtInt = (n: number): string => Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
export const fmtPct1 = (n: number): string => (Number.isFinite(n) ? n : 0).toFixed(1) + '%';
