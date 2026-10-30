import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadIndustryTemplate, shareViaEmail } from '../../assets/services/miscService';
import { hybridFixture } from '../../assets/prototypes/fixtures';
import { calc } from '../calculations/index';
import { fmtMoney0 } from '../calculations/currency';
import { setRangeCase } from '../calculations/rangeCase';
import { appStateFixture } from './test-utils';

describe('Email report staffing', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('hands the mail app current headcount and annual payroll instead of retired fields', () => {
    vi.useFakeTimers();
    const location = { origin: 'https://example.test', pathname: '/', search: '', href: '' };
    vi.stubGlobal('window', {
      location,
      state: {
        ...hybridFixture(), fullTimeEmployees: 2, partTimeEmployees: 1,
        fullTimeEmployeePay: 60000, partTimeEmployeePay: 20000,
        employees: 99, employeePay: 1
      }
    });
    shareViaEmail();
    expect(location.href).toMatch(/^mailto:/);
    const body = new URLSearchParams(location.href.split('?')[1]).get('body');
    expect(body).toContain('Employees: 3');
    expect(body).toContain('Annual Payroll: $140,000');
    expect(body).not.toContain('undefined');
    expect(body).not.toContain('NaN');
  });

  it.each(['USD', 'EUR'])('includes the selected annual conclusion, price units and tax basis for %s', currency => {
    vi.useFakeTimers();
    const model = { ...hybridFixture(), currency };
    setRangeCase('conservative');
    const location = { origin: 'https://example.test', pathname: '/', search: '', href: '' };
    vi.stubGlobal('window', { location, state: model });
    shareViaEmail();
    const params = new URLSearchParams(location.href.split('?')[1]);
    expect(params.get('subject')).toContain('Conservative case');
    const body = params.get('body');
    expect(body).toContain('Net income before tax: ' + fmtMoney0(calc(model).income));
    expect(body).toContain('Annual revenue: ' + fmtMoney0(calc(model).revenue));
    expect(body).toContain(`Voice coaching: ${fmtMoney0(60)}/session`);
    expect(body).toContain(`Starter kit: ${fmtMoney0(120)}/sale`);
    expect(body).toContain(`Studio membership: ${fmtMoney0(180)}/month`);
    expect(body).toContain(model.notes);
    expect(body).toContain('&case=conservative');
    if (currency === 'EUR') expect(body).toContain('US tax rules applied to EUR amounts, not a EUR tax estimate');
  });
});

describe('loadIndustryTemplate persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('INDUSTRY_TEMPLATES', {
      demo: { config: { offerings: [{ name: 'Consulting', priceMonthly: 100 }] } },
    });
    vi.stubGlobal('state', { ...appStateFixture({ offerings: [{}] }), offerings: [] });
    vi.stubGlobal('render', vi.fn());
    vi.stubGlobal('persistState', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('saves app state through the app persistState, not a stray storage key', () => {
    loadIndustryTemplate('demo');

    expect(window.persistState).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('undefined')).toBeNull();
  });
});
