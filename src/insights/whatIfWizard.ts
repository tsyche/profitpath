/**
 * Guided "What If?" wizard: a few common scenarios, each a pure state patch whose
 * impact is measured by re-running calc(), so previews match the main outputs.
 */

import { calc } from '../calculations/index';
import { hirePatch } from './insightsEngine';
import { getReverseCalculation } from './reverseCalculator';

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
  changes: Record<string, any> | null;
  note: string;
  before: WizardMetrics;
  after: WizardMetrics | null;
}

const pick = (m: any): WizardMetrics => ({
  takeHome: m.takeHome,
  income: m.income,
  capacityPct: m.capacityPct,
  clients: m.clients
});

const offeringList = (state: any): any[] => (Array.isArray(state.offerings) ? state.offerings : []).filter((o: any) => o && typeof o === 'object');

export function wizardScenarios(state: any): WizardScenario[] {
  const takeHome = Math.max(0, Math.round(calc(state).takeHome));
  const goal = Math.max(10000, Math.ceil((takeHome * 1.25) / 1000) * 1000);
  return [
    { id: 'hire', title: 'Hire more people', blurb: 'Adds capacity. Costs payroll, earns only if you can fill the hours.', param: { label: 'New employees', unit: '', min: 1, max: 5, step: 1, value: 1 } },
    { id: 'price', title: 'Change my prices', blurb: 'Scales every offering’s price by the same percentage.', param: { label: 'Price change', unit: '%', min: -20, max: 50, step: 1, value: 15 } },
    { id: 'clients', title: 'Gain or lose clients', blurb: 'Scales client volume across every offering.', param: { label: 'Client change', unit: '%', min: -50, max: 50, step: 5, value: -20 } },
    { id: 'costs', title: 'Cut variable costs', blurb: 'Scales the per-session cost of every offering.', param: { label: 'Cost reduction', unit: '%', min: 0, max: 50, step: 1, value: 10 } },
    { id: 'goal', title: 'Reach a take-home goal', blurb: 'Finds the price increase that gets you to a target after estimated tax.', param: { label: 'Desired annual take-home', unit: '$', min: 1000, max: 10000000, step: 1000, value: goal } }
  ];
}

function buildChanges(state: any, id: string, value: number): { changes: Record<string, any> | null; note: string } {
  const list = offeringList(state);
  const scaleEach = (key: string, factor: number, round: (n: number) => number) =>
    ({ offerings: list.map((o: any) => ({ ...o, [key]: round((Number(o[key]) || 0) * factor) })) });

  switch (id) {
    case 'hire':
      return { changes: hirePatch(state, value), note: '' };
    case 'price':
      return { changes: scaleEach('priceMonthly', 1 + value / 100, Math.round), note: '' };
    case 'clients':
      if (state.mode === 'forecast') {
        const util = Math.max(1, (Number(state.targetUtilizationPct) || 0) * (1 + value / 100));
        return { changes: { targetUtilizationPct: Math.round(util * 10) / 10 }, note: 'Forecast mode: scales target utilization, which sets client volume.' };
      }
      return { changes: scaleEach('currentClients', 1 + value / 100, (n) => Math.max(0, Math.round(n))), note: '' };
    case 'costs':
      return { changes: scaleEach('variableCostPerSession', 1 - value / 100, (n) => Math.round(n * 100) / 100), note: '' };
    case 'goal': {
      const r: any = getReverseCalculation(state, calc(state), value, 'pricing');
      if (!r) return { changes: null, note: 'Enter a goal above zero.' };
      if (r.requiresChange === false) return { changes: null, note: r.message };
      if (r.priceIncreasePct === null) return { changes: null, note: r.message };
      return { changes: scaleEach('priceMonthly', 1 + r.priceIncreasePct, Math.ceil), note: r.feasible ? '' : 'That needs more than doubling prices. Consider volume or costs too.' };
    }
    default:
      return { changes: null, note: 'Unknown scenario.' };
  }
}

export function previewScenario(state: any, id: string, value: number): WizardPreview {
  const before = pick(calc(state));
  if (!Number.isFinite(value)) return { changes: null, note: 'Enter a number.', before, after: null };
  const { changes, note } = buildChanges(state, id, value);
  if (!changes) return { changes: null, note, before, after: null };
  return { changes, note, before, after: pick(calc({ ...state, ...changes })) };
}
