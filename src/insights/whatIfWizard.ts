/**
 * Guided "What If?" wizard: a few common scenarios, each a pure state patch whose
 * impact is measured by re-running calc(), so previews match the main outputs.
 */

import type { CalcState, CalcResult, Offering } from '../types';
import { calc } from '../calculations/index';
import { hirePatch, partTimeHirePatch } from './insightsEngine';
import { isOneTime, isPerSession, monthlyFromPerSession, displayPrice } from '../calculations/offeringPrice';
import { ReverseCalculator } from './reverseCalculator';

export interface WizardScenario {
  id: string;
  title: string;
  blurb: string;
  /** The single dial the user sets for this scenario */
  param: { label: string; unit: string; min: number; max: number; step: number; value: number };
}

export interface WizardMetrics {
  takeHome: number;
  income: number;
  capacityPct: number;
  clients: number;
}

export interface WizardPreview {
  /** State patch to apply, or null when the scenario cannot be built */
  changes: Partial<CalcState> | null;
  note: string;
  before: WizardMetrics;
  after: WizardMetrics | null;
}

const pick = (m: CalcResult): WizardMetrics => ({
  takeHome: m.takeHome,
  income: m.income,
  capacityPct: m.capacityPct,
  clients: m.clients
});

const offeringList = (state: CalcState): Offering[] => (Array.isArray(state.offerings) ? state.offerings : []).filter((o: Offering) => o && typeof o === 'object');

export function wizardScenarios(state: CalcState): WizardScenario[] {
  const takeHome = Math.max(0, Math.round(calc(state).takeHome));
  const goal = Math.max(10000, Math.ceil((takeHome * 1.25) / 1000) * 1000);
  return [
    { id: 'hire', title: 'Hire more people', blurb: 'Adds capacity. Costs payroll, earns only if you can fill the hours.', param: { label: 'New employees', unit: '', min: 1, max: 5, step: 1, value: 1 } },
    { id: 'hirePart', title: 'Hire part-time', blurb: 'Adds part-time capacity at your part-time pay rate.', param: { label: 'New part-time employees', unit: '', min: 1, max: 5, step: 1, value: 1 } },
    { id: 'price', title: 'Change my prices', blurb: 'Scales every offering’s price by the same percentage.', param: { label: 'Price change', unit: '%', min: -20, max: 50, step: 1, value: 15 } },
    { id: 'clients', title: 'Gain or lose clients', blurb: 'Scales client volume across every offering.', param: { label: 'Client change', unit: '%', min: -50, max: 50, step: 5, value: -20 } },
    { id: 'costs', title: 'Cut variable costs', blurb: 'Scales the per-session cost of every offering.', param: { label: 'Cost reduction', unit: '%', min: 0, max: 50, step: 1, value: 10 } },
    { id: 'priceVolume', title: 'Change prices and volume together', blurb: 'Applies the same percentage to every price and to client volume.', param: { label: 'Change to both', unit: '%', min: -20, max: 30, step: 1, value: 10 } },
    { id: 'priceHire', title: 'Raise prices and hire one person', blurb: 'Scales every price, and adds one full-time hire to match.', param: { label: 'Price change', unit: '%', min: 0, max: 50, step: 1, value: 15 } },
    { id: 'market', title: 'Move prices toward the market average', blurb: 'Shifts each offering that has a market average entered; others stay as they are.', param: { label: 'Share of the gap closed', unit: '%', min: 0, max: 100, step: 10, value: 100 } },
    { id: 'goal', title: 'Reach a take-home goal', blurb: 'Finds the price increase that gets you to a target after estimated tax.', param: { label: 'Desired annual take-home', unit: '$', min: 1000, max: 10000000, step: 1000, value: goal } }
  ];
}

function buildChanges(state: CalcState, id: string, value: number): { changes: Partial<CalcState> | null; note: string } {
  const list = offeringList(state);
  const scaleEach = (key: string, factor: number, round: (n: number) => number) =>
    ({ offerings: list.map((o: Offering) => ({ ...o, [key]: round((Number((o as Record<string, unknown>)[key]) || 0) * factor) })) });

  const scaleClients = (pct: number): { changes: Partial<CalcState>; note: string } => {
    if (state.mode === 'forecast') {
      const util = Math.max(1, (Number(state.targetUtilizationPct) || 0) * (1 + pct / 100));
      return { changes: { targetUtilizationPct: Math.round(util * 10) / 10 }, note: 'Forecast mode: scales target utilization, which sets client volume.' };
    }
    return { changes: scaleEach('currentClients', 1 + pct / 100, (n) => Math.max(0, Math.round(n))), note: '' };
  };

  switch (id) {
    case 'hire':
      return { changes: hirePatch(state, value), note: '' };
    case 'hirePart': {
      const changes = partTimeHirePatch(state, value);
      if (!changes) return { changes: null, note: 'This scenario has no part-time headcount field to add to.' };
      return { changes, note: Number(state.partTimeEmployeePay) > 0 ? '' : 'Part-time pay is 0 in your inputs, so these hires cost nothing. Set a part-time pay rate for a real answer.' };
    }
    case 'priceVolume': {
      const volume = scaleClients(value);
      const prices = scaleEach('priceMonthly', 1 + value / 100, Math.round);
      // Both patches touch offerings in Current mode: layer prices over the scaled client counts
      const scaled = volume.changes.offerings;
      const offerings = scaled
        ? prices.offerings.map((o: Offering, i: number) => ({ ...o, currentClients: scaled[i].currentClients }))
        : prices.offerings;
      return { changes: { ...volume.changes, offerings }, note: volume.note };
    }
    case 'priceHire':
      return { changes: { ...hirePatch(state, 1), ...scaleEach('priceMonthly', 1 + value / 100, Math.round) }, note: '' };
    case 'market': {
      const t = Math.min(100, Math.max(0, value)) / 100;
      let moved = 0;
      const offerings = list.map((o: Offering) => {
        const avg = Number(o.marketAvg);
        if (!(avg > 0)) return o;
        moved++;
        const cur = displayPrice({ ...o, priceMonthly: o.priceMonthly || 0, sessionsPerYear: o.sessionsPerYear || 0 });
        const target = cur + (avg - cur) * t;
        const priceMonthly = isOneTime(o) ? target / 12 : isPerSession(o) ? monthlyFromPerSession(target, Number(o.sessionsPerYear) || 0) : target;
        return { ...o, priceMonthly: Math.round(priceMonthly * 100) / 100 };
      });
      if (moved === 0) return { changes: null, note: 'No offering has a market average entered. Add one in the market columns first.' };
      return { changes: { offerings }, note: '' };
    }
    case 'price':
      return { changes: scaleEach('priceMonthly', 1 + value / 100, Math.round), note: '' };
    case 'clients':
      return scaleClients(value);
    case 'costs':
      return { changes: scaleEach('variableCostPerSession', 1 - value / 100, (n) => Math.round(n * 100) / 100), note: '' };
    case 'goal': {
      const r = new ReverseCalculator(state, calc(state)).calculateRequiredPricing(value);
      if (!r) return { changes: null, note: 'Enter a goal above zero.' };
      if (!('priceIncreasePct' in r) || r.priceIncreasePct === null) return { changes: null, note: r.message };
      return { changes: scaleEach('priceMonthly', 1 + r.priceIncreasePct, Math.ceil), note: r.feasible ? '' : 'That needs more than doubling prices. Consider volume or costs too.' };
    }
    default:
      return { changes: null, note: 'Unknown scenario.' };
  }
}

export function previewScenario(state: CalcState, id: string, value: number): WizardPreview {
  const before = pick(calc(state));
  if (!Number.isFinite(value)) return { changes: null, note: 'Enter a number.', before, after: null };
  const { changes, note } = buildChanges(state, id, value);
  if (!changes) return { changes: null, note, before, after: null };
  return { changes, note, before, after: pick(calc({ ...state, ...changes })) };
}
