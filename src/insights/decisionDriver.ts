/**
 * Live driver lens for the decision workbench (ROADMAP 45). Pick one input, move it
 * across every option at once, and watch net income and the verdict recompute.
 *
 * Display-only: buildDecision applies the driver to cased copies inside one call, so
 * saved scenarios, bundles and share links never see it. A zero change is an exact
 * identity (applyDriverToOffering returns the input object), which is what makes the
 * slider's base position reproduce the workbench table.
 *
 * Group drivers are in runs, converted with seats × fill — the same rule calc uses:
 * runs = ceil(clients / (seats × fill)).
 */

import type { CalcState, Offering, OfferingType } from '../types';
import { clamp } from '../../assets/utils/helpers';
import { displayPrice, monthlyFromPerSession } from '../calculations/offeringPrice';
import { formatMoney0 } from '../calculations/currency';

export type DriverKind = 'price' | 'clients' | 'runs' | 'fill' | 'salesLoss';

export const DRIVER_KINDS: readonly DriverKind[] = ['price', 'clients', 'runs', 'fill', 'salesLoss'];

const KIND_LABELS: Record<DriverKind, string> = {
  price: 'Price',
  clients: 'Clients',
  runs: 'Group runs',
  fill: 'Fill %',
  salesLoss: 'Sales loss %'
};

/** One driver position: which matched offering row, which input, and the change from loaded. */
export interface DriverSpec {
  kind: DriverKind;
  /** Index into the decision's offeringRows (rows are matched across options). */
  rowIndex: number;
  /** Change applied from each option's own loaded value; 0 is the identity/base position. */
  delta: number;
}

/** A selectable driver with its slider bounds, all expressed as a change from loaded values. */
export interface DriverDef {
  /** `${kind}:${rowIndex}` within one defs snapshot. */
  id: string;
  kind: DriverKind;
  rowIndex: number;
  label: string;
  rowName: string;
  min: number;
  max: number;
  step: number;
  /** Loaded value of the option used for the status line's before → after. */
  baseValue: number;
  baseOptionName: string;
  /** That option's offering, for price units and the runs clients annotation. */
  offering: Offering;
}

/** A slider position where the highest-income option changes. */
export interface DriverCrossover {
  delta: number;
  winnerIndex: number;
}

// Same bounds calc's sanitizeOfferings applies, so loaded values match what calc sees.
const MAX_MONEY = 1e12;
const MAX_COUNT = 1e6;

const finite = (v: unknown, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Filled seats of a group run: sanitized seats × fill%, matching calc's cohort divisor. */
export function filledSeats(o: Offering): number {
  const seats = Math.floor(clamp(finite(o.seats, 1), 1, MAX_COUNT));
  const fill = clamp(finite(o.fillPct, 100), 1, 100);
  return seats * (fill / 100);
}

/** Current-mode cohorts for a group: ceil(clients / filled seats) — calc's `currentGroupRuns` rule. */
export function groupRuns(o: Offering): number {
  if (o.type !== 'group') return 0;
  const clients = clamp(Math.floor(finite(o.currentClients, 0)), 0, MAX_COUNT);
  return Math.ceil(clients / filledSeats(o));
}

/** The calc-visible loaded value of one driver on one offering; null when the driver does not apply. */
export function loadedDriverValue(kind: DriverKind, o: Offering): number | null {
  switch (kind) {
    case 'price': {
      const sessionsPerYear = clamp(finite(o.sessionsPerYear, 0), 0, MAX_COUNT);
      if (o.type === 'per-session' && sessionsPerYear === 0) return null;
      const value = displayPrice({ ...o, priceMonthly: clamp(finite(o.priceMonthly, 0), 0, MAX_MONEY), sessionsPerYear });
      return Number.isFinite(value) ? value : null;
    }
    case 'clients': return clamp(Math.floor(finite(o.currentClients, 0)), 0, MAX_COUNT);
    case 'runs': return o.type === 'group' ? groupRuns(o) : null;
    case 'fill': return o.type === 'group' ? clamp(finite(o.fillPct, 100), 1, 100) : null;
    case 'salesLoss': return clamp(finite(o.salesLossPct, 0), 0, 100);
  }
}

/** Where a loaded value lands after a change, before per-kind writing rules. */
export function driverAfter(kind: DriverKind, loaded: number, delta: number): number {
  switch (kind) {
    case 'price': return Math.max(0, loaded + delta);
    case 'clients': return clamp(loaded + Math.round(delta), 0, MAX_COUNT);
    case 'runs': return Math.max(0, loaded + Math.round(delta));
    case 'fill': return clamp(loaded + delta, 1, 100);
    case 'salesLoss': return clamp(loaded + delta, 0, 100);
  }
}

/**
 * New offering for a driver change, or the same object when the change is a no-op.
 * A zero delta always returns the input, which keeps the slider's base position exact.
 */
export function applyDriverToOffering(o: Offering, kind: DriverKind, delta: number): Offering {
  if (delta === 0) return o;
  const loaded = loadedDriverValue(kind, o);
  if (loaded === null) return o;
  const after = driverAfter(kind, loaded, delta);
  if (after === loaded) return o;
  switch (kind) {
    case 'price': {
      const monthly = o.type === 'one-time' ? after / 12
        : o.type === 'per-session' ? monthlyFromPerSession(after, clamp(finite(o.sessionsPerYear, 0), 0, MAX_COUNT)) : after;
      return { ...o, priceMonthly: clamp(monthly, 0, MAX_MONEY) };
    }
    case 'clients': return { ...o, currentClients: after };
    // Whole cohorts: clients move in filled-seat steps so calc's ceil rule lands on after runs.
    case 'runs': return { ...o, currentClients: clamp(Math.floor(after * filledSeats(o)), 0, MAX_COUNT) };
    case 'fill': return { ...o, fillPct: after };
    case 'salesLoss': return { ...o, salesLossPct: after };
  }
}

/** Effective value after calculator limits and whole-client conversion. */
export function appliedDriverValue(def: DriverDef, delta: number): number {
  return loadedDriverValue(def.kind, applyDriverToOffering(def.offering, def.kind, delta)) ?? def.baseValue;
}

/** Slider span stays at most 400 steps so the crossover scan stays interactive. */
function stepFor(span: number): number {
  return span > 400 ? Math.ceil(span / 400) : 1;
}

/** Raise headroom when every option sits at 0 (a free service, an empty row). */
const DEFAULT_UP: Partial<Record<DriverKind, number>> = { price: 100, clients: 100, runs: 12 };

/** One matched row of the decision: which offering index each option uses for it. */
export interface DriverRow {
  name: string;
  indices: (number | null)[];
  inputs: (Offering | null)[];
}

/**
 * Every driver the current decision can move, with change-from-loaded bounds.
 * Clients and group runs only exist in Current mode; fill and runs need a group row.
 */
export function listDriverDefs(opts: {
  rows: DriverRow[];
  /** Loaded (cased) states, built without the driver. */
  states: CalcState[];
  mode: string | undefined;
  optionNames: string[];
}): DriverDef[] {
  const currentMode = (opts.mode || 'forecast') === 'current';
  const defs: DriverDef[] = [];
  opts.rows.forEach((row, rowIndex) => {
    const rowName = row.name || 'Unnamed offering';
    for (const kind of DRIVER_KINDS) {
      if ((kind === 'clients' || kind === 'runs') && !currentMode) continue;
      const values: { optionIndex: number; value: number }[] = [];
      row.indices.forEach((idx, optionIndex) => {
        if (idx === null || idx === undefined) return;
        const offering = opts.states[optionIndex].offerings?.[idx];
        if (!offering) return;
        const value = loadedDriverValue(kind, offering);
        if (value !== null) values.push({ optionIndex, value });
      });
      if (!values.length) continue;
      // Whole client counts cannot represent every run when a cohort has less than one filled seat.
      if (kind === 'runs' && values.some(v => filledSeats(opts.states[v.optionIndex].offerings![row.indices[v.optionIndex]!]) < 1)) continue;
      const numbers = values.map(v => v.value);
      const lo = Math.min(...numbers);
      const hi = Math.max(...numbers);
      let min: number;
      let max: number;
      if (kind === 'fill') {
        // The floor is 1% and the ceiling 100%; when one option already sits on a
        // bound, still allow moving the others across the remaining range.
        min = lo > 1 ? -(lo - 1) : -(hi - 1);
        max = 100 - hi;
      } else if (kind === 'salesLoss') {
        min = lo > 0 ? -lo : -hi;
        max = 100 - hi;
      } else {
        min = lo > 0 ? -lo : -hi;
        max = hi > 0 ? hi : (DEFAULT_UP[kind] ?? 100);
      }
      if (!(max > min) || !Number.isFinite(max - min)) continue;
      const step = stepFor(max - min);
      // Native range inputs anchor steps at min; include zero on the same grid as number edits and scans.
      min = Math.floor(min / step) * step;
      max = Math.ceil(max / step) * step;
      const base = values.find(v => v.optionIndex === 0) ?? values[0];
      const baseOffering = opts.states[base.optionIndex].offerings?.[row.indices[base.optionIndex]!];
      if (!baseOffering) continue;
      defs.push({
        id: `${kind}:${rowIndex}`,
        kind,
        rowIndex,
        label: `${KIND_LABELS[kind]} — ${rowName}`,
        rowName,
        min,
        max,
        step,
        baseValue: base.value,
        baseOptionName: opts.optionNames[base.optionIndex] || `Option ${base.optionIndex + 1}`,
        offering: baseOffering
      });
    }
  });
  return defs;
}

/** Walk the slider's positions once and record where the leading option changes. Ties keep the earlier option. */
export function scanWinnerChanges(
  min: number,
  max: number,
  step: number,
  winnerAt: (delta: number) => number
): DriverCrossover[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || !(step > 0) || max <= min) return [];
  const steps = Math.min(1000, Math.floor((max - min) / step + 1e-9));
  const out: DriverCrossover[] = [];
  let previous = winnerAt(min);
  for (let i = 1; i <= steps; i++) {
    const delta = min + i * step;
    const winner = winnerAt(delta);
    if (winner !== previous) out.push({ delta, winnerIndex: winner });
    previous = winner;
  }
  return out;
}

/** Money with an explicit sign for slider deltas (formatMoney0 omits "+"). */
export function formatDriverDelta(def: DriverDef, delta: number, currency: string): string {
  const sign = delta > 0 ? '+' : '';
  if (def.kind === 'price') return sign + formatMoney0(delta, currency);
  if (def.kind === 'fill' || def.kind === 'salesLoss') return `${sign}${round1(delta)}%`;
  return `${sign}${Math.round(delta)} ${def.kind === 'runs' ? 'runs' : 'clients'}`;
}

/** A driver value in its display units: money with the price cell's suffix, a percent, or a count. */
export function formatDriverValue(def: DriverDef, value: number, currency: string): string {
  if (def.kind === 'price') {
    const suffix = (def.offering.type as OfferingType) === 'one-time' ? ' / sale'
      : (def.offering.type as OfferingType) === 'per-session' ? ' / session' : ' / month';
    return formatMoney0(value, currency) + suffix;
  }
  if (def.kind === 'fill' || def.kind === 'salesLoss') return `${round1(value)}%`;
  return String(Math.round(value));
}

/** The aria-live line under the slider: before → after on the anchor option, then leader changes. */
export function driverStatusText(opts: {
  def: DriverDef;
  delta: number;
  currency: string;
  crossovers: DriverCrossover[];
  optionNames: string[];
}): string {
  const { def, delta, currency, crossovers, optionNames } = opts;
  if (delta === 0) return 'No change — results match the loaded options.';
  const moved = applyDriverToOffering(def.offering, def.kind, delta);
  const after = loadedDriverValue(def.kind, moved) ?? def.baseValue;
  const fmt = (v: number) => formatDriverValue(def, v, currency);
  const parts = [
    `Change ${formatDriverDelta(def, delta, currency)}: ${def.baseOptionName} ${def.rowName} ` +
    `${fmt(def.baseValue)} → ${fmt(after)}. Each option moves from its own loaded value.`
  ];
  if (def.kind === 'runs') {
    const clientsBefore = loadedDriverValue('clients', def.offering);
    if (clientsBefore !== null) parts.push(`${def.baseOptionName} clients ${clientsBefore} → ${loadedDriverValue('clients', moved)}.`);
  }
  if (crossovers.length) {
    parts.push(crossovers.map(c => `Leader changes at ${formatDriverDelta(def, c.delta, currency)} → ${optionNames[c.winnerIndex]}`).join('; ') + '.');
  } else {
    parts.push('No leader change in this slider range.');
  }
  return parts.join(' ');
}
