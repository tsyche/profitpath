/** Fixed cost of one group run (room hire, hired-in instructor, consumables), plus the break-even fill it implies. */

const MAX_COST_PER_RUN = 1e9;

/** Untrusted cost-per-run input to a finite, non-negative dollar amount; blank or garbage is 0 (no run cost). */
export function sanitizeCostPerRun(v: unknown): number {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? Math.min(MAX_COST_PER_RUN, Math.max(0, n)) : 0;
}

/**
 * Seats one run needs to cover its own cost: costPerRun / what each seat contributes after per-seat variable cost.
 * 0 when there is no run cost, Infinity when a seat contributes nothing. Staff pay is a fixed cost elsewhere, so it is not in here.
 */
export function breakEvenSeats(costPerRun: number, contributionPerSeat: number): number {
  if (costPerRun <= 0) return 0;
  return contributionPerSeat > 0 ? Math.ceil(costPerRun / contributionPerSeat) : Infinity;
}
