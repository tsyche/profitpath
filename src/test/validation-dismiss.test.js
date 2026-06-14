// Regression tests for dismissible validation banners.
// Banners can be dismissed via the X button, and a dismissed message stays gone
// across re-renders (validation re-runs on every input change) rather than
// popping back on the next keystroke.

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Re-imported fresh per test so the module-level "dismissed" set doesn't leak
// between cases (in the real app that set is intentionally session-persistent).
let updateValidationDisplay;

function mountContainer() {
  document.body.innerHTML = '<div id="validationContainer" style="display:none;"></div>';
  return document.getElementById('validationContainer');
}

// A state guaranteed to produce at least one validation message (mix % != 100 in
// forecast mode triggers a "Mix percentages sum to..." warning).
function warningState() {
  return {
    mode: 'forecast',
    fullTimeEmployees: 1,
    partTimeEmployees: 0,
    fullTimeEmployeePay: 60000,
    partTimeEmployeePay: 0,
    monthlyCosts: 1000,
    productiveUtilizationPct: 80,
    targetUtilizationPct: 80,
    targetClients: 10,
    lockMix: false,
    offerings: [
      { id: 'a', name: 'Service', priceMonthly: 100, sessionsPerYear: 12, hoursPerSession: 1, variableCostPerSession: 0, mixPct: 50, currentClients: 5 },
    ],
  };
}

describe('Dismissible validation banners', () => {
  beforeEach(async () => {
    global.state = warningState();
    // Healthy metrics so the only warning is the mix-percentage one we set up.
    global.calc = () => ({ capacityPct: 80, clients: 10, income: 5000, revenue: 12000, serviceHours: 100 });
    vi.resetModules();
    ({ updateValidationDisplay } = await import('../../assets/services/businessLogic.js'));
  });

  it('renders a dismiss button on each validation item', () => {
    const container = mountContainer();
    updateValidationDisplay();

    const items = container.querySelectorAll('.validation-item');
    expect(items.length).toBeGreaterThan(0);
    items.forEach(item => {
      expect(item.querySelector('.validation-dismiss')).not.toBeNull();
      expect(item.dataset.vkey).toBeTruthy();
    });
    expect(container.style.display).toBe('block');
  });

  it('removes a banner when its dismiss button is clicked', () => {
    const container = mountContainer();
    updateValidationDisplay();

    const before = container.querySelectorAll('.validation-item').length;
    const firstKey = container.querySelector('.validation-item').dataset.vkey;

    container.querySelector('.validation-dismiss').click();

    const remaining = [...container.querySelectorAll('.validation-item')].map(i => i.dataset.vkey);
    expect(remaining).not.toContain(firstKey);
    expect(remaining.length).toBe(before - 1);
  });

  it('keeps a dismissed banner hidden across re-renders while the condition persists', () => {
    const container = mountContainer();
    updateValidationDisplay();

    const firstKey = container.querySelector('.validation-item').dataset.vkey;
    container.querySelector('.validation-dismiss').click();

    // Re-render (as would happen on the next input change) — dismissed stays gone.
    updateValidationDisplay();
    const keys = [...container.querySelectorAll('.validation-item')].map(i => i.dataset.vkey);
    expect(keys).not.toContain(firstKey);
  });
});
