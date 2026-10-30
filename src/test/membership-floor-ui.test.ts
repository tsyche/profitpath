import { afterEach, expect, it } from 'vitest';
import { state } from '../../assets/state/appState';
import { renderMarketTable, renderOfferingRanking } from '../../assets/components/RangesMarketPanel';
import { calc } from '../calculations';
import { setRangeCase } from '../calculations/rangeCase';

afterEach(() => { setRangeCase('base'); document.body.innerHTML = ''; });

it('uses the selected frequency case for both membership ranking and market floor warnings', () => {
  state.offerings = [{
    id: 'studio', name: 'Studio', type: 'per-session', priceMonthly: 60, sessionsPerYear: 12,
    sessionsPerYearLow: 6, hoursPerSession: 1, variableCostPerSession: 70,
    currentClients: 10, mixPct: 100, marketLow: 50, marketAvg: 60, marketHigh: 70
  }];
  state.membershipPlans = [{
    id: 'p', name: 'Member', monthlyFee: 100, creditsPerMonth: 0, memberDiscountPct: 0,
    eligible: ['studio'], includedVisits: { studio: 2 }
  }];
  document.body.innerHTML = '<div id="offeringRanking"><table><tbody id="offeringRankingBody"></tbody></table></div><table><tbody id="marketBody"></tbody></table>';
  setRangeCase('optimistic');
  const metrics = calc(state);
  renderOfferingRanking(metrics);
  renderMarketTable(metrics);
  expect(document.querySelector('#offeringRankingBody [data-status="loss"]')).not.toBeNull();
  expect(document.querySelector('#marketBody [data-level="red"]')).not.toBeNull();
});
