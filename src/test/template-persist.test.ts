import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadIndustryTemplate, shareViaEmail } from '../../assets/services/miscService';
import { hybridFixture } from '../../assets/prototypes/fixtures';

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
});

describe('loadIndustryTemplate persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    window.INDUSTRY_TEMPLATES = {
      demo: { config: { offerings: [{ name: 'Consulting', priceMonthly: 100 }] } },
    };
    window.state = { offerings: [] };
    window.render = vi.fn();
    window.persistState = vi.fn();
  });

  afterEach(() => {
    delete window.INDUSTRY_TEMPLATES;
    delete window.state;
    delete window.render;
    delete window.persistState;
    localStorage.clear();
  });

  it('saves app state through the app persistState, not a stray storage key', () => {
    loadIndustryTemplate('demo');

    expect(window.persistState).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('undefined')).toBeNull();
  });
});
