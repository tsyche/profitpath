import { afterEach, describe, expect, it } from 'vitest';
import { calc } from '../calculations/index';
import { calcRange } from '../calculations/ranges';
import { setRangeCase } from '../calculations/rangeCase';
import type { CalcState } from '../types';
import { renderSimpleChart, updateRichVisualizations } from '../../assets/services/visualizationService';

const model: CalcState = {
  mode: 'current' as const,
  fullTimeEmployees: 1,
  partTimeEmployees: 0,
  fullTimeEmployeePay: 60000,
  productiveUtilizationPct: 80,
  offerings: [{
    name: 'Service', priceMonthly: 100, sessionsPerYear: 12, hoursPerSession: 1,
    variableCostPerSession: 10, currentClients: 40, currentClientsLow: 10, currentClientsHigh: 80
  }]
};

function renderCharts(state = model) {
  document.body.innerHTML = '<div id="simpleChart"></div><div id="richVisualizations"></div>';
  const metrics = calc(state);
  const range = calcRange(state);
  renderSimpleChart(metrics, range);
  updateRichVisualizations(metrics, range);
  return range;
}

afterEach(() => { document.body.innerHTML = ''; });

describe('Chart uncertainty bands with the real calculator', () => {
  it('carries revenue, profit (including losses), and utilization bands into their charts', () => {
    const bands = renderCharts()!;
    for (const metric of ['revenue', 'income', 'capacityPct'] as const) {
      const chart = document.querySelector<HTMLElement>(`.chart-range[data-metric="${metric}"]`)!;
      expect(chart).not.toBeNull();
      expect(Number(chart.dataset.min)).toBe(bands[metric].min);
      expect(Number(chart.dataset.base)).toBe(bands[metric].base);
      expect(Number(chart.dataset.max)).toBe(bands[metric].max);
      expect(chart.textContent).toContain('Base');
      expect(chart.textContent).toContain('Viewed case');
      expect(chart.querySelector('svg')!.outerHTML).not.toMatch(/NaN|Infinity/);
    }
    expect(bands.income.min).toBeLessThan(0);
    expect(bands.income.max).toBeGreaterThan(0);
    expect(document.querySelector('#simpleChart .chart-range')).not.toBeNull();
    expect(document.querySelector('.utilization-gauge .chart-range')).not.toBeNull();
    expect(document.querySelector('.profit-waterfall .chart-range')).not.toBeNull();
  });

  it('keeps the true base band while moving the viewed-case marker', () => {
    const baseBand = calcRange(model)!;
    setRangeCase('conservative');
    renderCharts();
    const chart = document.querySelector<HTMLElement>('.chart-range[data-metric="revenue"]')!;
    expect(Number(chart.dataset.base)).toBe(baseBand.revenue.base);
    expect(Number(chart.dataset.current)).toBe(calc(model).revenue);
    expect(Number(chart.dataset.current)).toBeLessThan(baseBand.revenue.base);
  });

  it('hides absent or collapsed bands and removes stale bands after clearing bounds', () => {
    renderCharts();
    expect(document.querySelectorAll('.chart-range')).toHaveLength(3);
    const offering = { ...model.offerings![0] };
    delete offering.currentClientsLow;
    delete offering.currentClientsHigh;
    renderCharts({ ...model, offerings: [offering] });
    expect(document.querySelectorAll('.chart-range')).toHaveLength(0);
    renderCharts({ ...model, offerings: [{ ...offering, currentClientsLow: 40, currentClientsHigh: 40 }] });
    expect(document.querySelectorAll('.chart-range')).toHaveLength(0);
  });

  it('renders an annual revenue band even when the viewed case has zero revenue', () => {
    renderCharts({ ...model, offerings: [{ ...model.offerings![0], currentClients: 0 }] });
    expect(document.querySelector('#simpleChart .chart-range')).not.toBeNull();
    expect(document.querySelector('#simpleChart')!.textContent).toContain('No revenue to display');
  });
});
