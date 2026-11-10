import type { CalcState } from '../types';
import { RANGE_CASES, type RangeCase } from '../calculations/rangeCase';
import { encodeScenarioBundle } from './scenarioBundle';

export { decodeScenarioBundle } from './scenarioBundle';
export { sanitizeScenarioState } from './sanitizeScenario';

export interface DecisionLinkOptions {
  baseUrl: string;
  selectedCase?: RangeCase;
  annualGoal?: number | null;
}

/** First option is the baseline. Uses the same bounded v1 bundle as the browser. */
export function encodeDecisionLink(
  options: readonly { name: string; state: CalcState }[],
  { baseUrl, selectedCase = 'base', annualGoal = null }: DecisionLinkOptions
): string | null {
  if (options.length < 2 || options.length > 4 || !RANGE_CASES.includes(selectedCase)) return null;
  if (annualGoal !== null && (!Number.isInteger(annualGoal) || annualGoal < 0 || annualGoal > 1e12)) return null;
  const encoded = encodeScenarioBundle(options, baseUrl);
  if (!encoded) return null;
  const url = new URL(encoded);
  url.searchParams.set('decision', '1');
  url.searchParams.set('case', selectedCase);
  if (annualGoal !== null) url.searchParams.set('goal', String(annualGoal));
  return url.toString();
}
