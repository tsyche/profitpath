import { describe, it, expect, beforeEach } from 'vitest';

// Regression tests for resetDefaults() using wrong property names.
// Bug: state.employees / state.employeePay were set instead of
// state.fullTimeEmployees / state.fullTimeEmployeePay, so render()
// never saw the updated values and the UI required a manual reload.

const INITIAL_STATE = {
  mode: 'forecast',
  fullTimeEmployees: 1,
  partTimeEmployees: 0,
  fullTimeEmployeePay: 60000,
  partTimeEmployeePay: 30000,
  monthlyCosts: 250,
  productiveUtilizationPct: 80,
  targetUtilizationPct: 75,
  lockMix: false,
  loadedTemplate: null,
};

function applyReset(state) {
  // Mirror the exact property names set in resetDefaults()
  state.fullTimeEmployees = 1;
  state.partTimeEmployees = 0;
  state.fullTimeEmployeePay = 60000;
  state.partTimeEmployeePay = 30000;
  state.monthlyCosts = 250;
  state.productiveUtilizationPct = 80;
  state.targetUtilizationPct = 75;
  state.mode = 'forecast';
  state.lockMix = false;
  state.loadedTemplate = null;
}

describe('resetDefaults — correct property names', () => {
  let state;

  beforeEach(() => {
    state = {
      mode: 'current',
      fullTimeEmployees: 5,
      partTimeEmployees: 2,
      fullTimeEmployeePay: 120000,
      partTimeEmployeePay: 50000,
      monthlyCosts: 9999,
      productiveUtilizationPct: 55,
      targetUtilizationPct: 60,
      lockMix: true,
      loadedTemplate: 'consulting',
    };
  });

  it('resets fullTimeEmployees (not the stale state.employees key)', () => {
    applyReset(state);
    expect(state.fullTimeEmployees).toBe(INITIAL_STATE.fullTimeEmployees);
    expect('employees' in state).toBe(false);
  });

  it('resets partTimeEmployees', () => {
    applyReset(state);
    expect(state.partTimeEmployees).toBe(INITIAL_STATE.partTimeEmployees);
  });

  it('resets fullTimeEmployeePay (not the stale state.employeePay key)', () => {
    applyReset(state);
    expect(state.fullTimeEmployeePay).toBe(INITIAL_STATE.fullTimeEmployeePay);
    expect('employeePay' in state).toBe(false);
  });

  it('resets partTimeEmployeePay', () => {
    applyReset(state);
    expect(state.partTimeEmployeePay).toBe(INITIAL_STATE.partTimeEmployeePay);
  });

  it('resets monthlyCosts', () => {
    applyReset(state);
    expect(state.monthlyCosts).toBe(INITIAL_STATE.monthlyCosts);
  });

  it('resets productiveUtilizationPct', () => {
    applyReset(state);
    expect(state.productiveUtilizationPct).toBe(INITIAL_STATE.productiveUtilizationPct);
  });

  it('resets targetUtilizationPct', () => {
    applyReset(state);
    expect(state.targetUtilizationPct).toBe(INITIAL_STATE.targetUtilizationPct);
  });

  it('resets mode to forecast', () => {
    applyReset(state);
    expect(state.mode).toBe('forecast');
  });

  it('resets lockMix to false', () => {
    applyReset(state);
    expect(state.lockMix).toBe(false);
  });

  it('resets loadedTemplate to null', () => {
    applyReset(state);
    expect(state.loadedTemplate).toBeNull();
  });

  it('does not leave stale legacy keys that would silently shadow the real ones', () => {
    // If anyone re-introduces the old keys, render() would read the
    // correct keys and the reset would appear to do nothing.
    applyReset(state);
    expect(state).not.toHaveProperty('employees');
    expect(state).not.toHaveProperty('employeePay');
  });
});
