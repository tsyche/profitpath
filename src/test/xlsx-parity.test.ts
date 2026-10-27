import { describe, it, expect } from 'vitest';
import { buildCSV, sanitizeScenarioState } from '../../assets/services/miscService';
import { buildReportSections, buildWorkbookSheets } from '../../assets/services/reportSections';
import { buildXLSX, readXLSX, type XlsxSheet } from '../../assets/utils/xlsx';
import { calc } from '../../src/calculations/index';

/**
 * Roadmap 33 — Excel export parity.
 *
 * The workbook must carry every field the share URL persists (the same list the
 * scenario sanitizer allowlists), not just offerings. These tests walk that
 * sanitized object and fail on any value that never reaches a cell, so adding a
 * persisted field without exporting it breaks here first.
 */

// A TSS-shaped scenario: group + 1:1 + a staff-free room, expenses in every
// frequency, ranges, market, confidence, two membership plans and a profile.
const raw = {
  mode: 'current',
  fullTimeEmployees: 2,
  partTimeEmployees: 1,
  fullTimeEmployeePay: 72000,
  partTimeEmployeePay: 24000,
  monthlyCosts: 1500,
  processingFeePct: 2.9,
  productiveUtilizationPct: 75,
  targetUtilizationPct: 80,
  currency: 'EUR',
  notes: 'Renew the lease before Q3; the Sound Stage plan assumes one coach.',
  lockMix: true,
  loadedTemplate: 'fitness',
  offerings: [
    {
      id: 'o-studio',
      name: 'Studio, "A"',
      priceMonthly: 150,
      sessionsPerYear: 24,
      hoursPerSession: 1.5,
      variableCostPerSession: 12,
      mixPct: 40,
      currentClients: 18,
      laborPctOfPrice: 25,
      type: 'group',
      seats: 8,
      fillPct: 80,
      fillPctLow: 60,
      fillPctHigh: 95,
      currentClientsLow: 10,
      currentClientsHigh: 30,
      sessionsPerYearLow: 18,
      sessionsPerYearHigh: 30,
      costPerRun: 220,
      discountPct: 10,
      confidence: 'verified',
      note: 'Peak evening slot',
      marketLow: 120,
      marketHigh: 200,
      marketAvg: 160,
      marketNote: 'Local studios',
      resource: 'r-room'
    },
    {
      id: 'o-mix',
      name: 'Mixing & <Mastering>',
      priceMonthly: 3300,
      sessionsPerYear: 12,
      hoursPerSession: 3,
      variableCostPerSession: 40,
      mixPct: 60,
      currentClients: 4,
      laborPctOfPrice: 0,
      type: 'subscription',
      seats: 1,
      fillPct: 100,
      costPerRun: 0,
      discountPct: 0,
      confidence: 'guess',
      note: '',
      resource: 'r-booth'
    }
  ],
  expenses: [
    { id: 'e-rent', name: 'Rent, main room', category: 'Rent/Lease', amount: 1500, frequency: 'monthly' },
    { id: 'e-clean', name: 'Cleaning', category: 'Supplies/COGS', amount: 20, frequency: 'weekly' },
    { id: 'e-ins', name: 'Insurance', category: 'Insurance', amount: 900, frequency: 'annual' },
    { id: 'e-mic', name: 'Mic overhaul', category: 'Equipment', amount: 2400, frequency: 'one-time', lifeYears: 5 }
  ],
  resources: [
    { id: 'r-room', name: 'Rehearsal Room', hoursPerWeek: 40, weeksPerYear: 50 },
    { id: 'r-booth', name: 'Booth', hoursPerWeek: 20, weeksPerYear: 48, staffFree: true }
  ],
  membershipPlans: [
    {
      id: 'p-unlimited',
      name: 'Unlimited',
      monthlyFee: 181,
      creditsPerMonth: 8,
      memberDiscountPct: 15,
      creditsAtMemberPrice: true,
      eligible: ['o-studio', 'o-mix'],
      includedVisits: { 'o-studio': 1 }
    }
  ],
  memberProfiles: [
    {
      id: 'm-regular',
      name: 'Regular',
      visits: { 'o-studio': 6, 'o-mix': 0.5 },
      visitsLow: { 'o-studio': 2 },
      visitsHigh: { 'o-mix': 4 }
    }
  ]
};

const clean = sanitizeScenarioState(raw)!;
const results = calc(clean);
const sheets = buildWorkbookSheets(clean, results);
const bytes = buildXLSX(sheets);
const cells = readXLSX(bytes)
  .flatMap((s) => s.rows.flat())
  .filter((v) => v !== '' && v !== null && v !== undefined)
  .map((v) => String(v));

// UI-only toggles: they gate behaviour, they are not business data worth a cell
const UI_ONLY = new Set(['lockMix', 'loadedTemplate']);
// Ids that the report renders by name instead (import resolves the names back)
const NAME_REF = new Set(['resource', 'eligible']);
const VISITS_KEYS = new Set(['visits', 'visitsLow', 'visitsHigh', 'includedVisits']);

const nameOf = new Map<string, string>([
  ...clean.offerings.map((o) => [o.id, o.name] as [string, string]),
  ...(clean.resources || []).map((r) => [r.id, r.name] as [string, string])
]);

function collectValues(node: unknown, out: string[]): void {
  if (node === null || node === undefined || typeof node === 'boolean') return;
  if (typeof node === 'number') { out.push(String(node)); return; }
  if (typeof node === 'string') { if (node) out.push(node); return; }
  if (Array.isArray(node)) { node.forEach((v) => collectValues(v, out)); return; }
  for (const [k, v] of Object.entries(node)) {
    if (k === 'id' || UI_ONLY.has(k)) continue;
    if (k === 'mode') { out.push(v === 'current' ? 'Current' : 'Forecast'); continue; }
    if (NAME_REF.has(k)) {
      for (const id of Array.isArray(v) ? v : [v]) {
        const name = nameOf.get(String(id));
        if (name) out.push(name);
      }
      continue;
    }
    if (VISITS_KEYS.has(k)) {
      for (const [id, n] of Object.entries(v as Record<string, number>)) {
        const name = nameOf.get(id);
        if (name) out.push(name);
        out.push(String(n));
      }
      continue;
    }
    collectValues(v, out);
  }
}

const expected = [...new Set(collectValues(clean, []))];

describe('Excel workbook carries the whole persisted model (roadmap 33)', () => {
  it('is a real zip workbook, not a CSV blob under an .xlsx name', () => {
    expect(String.fromCharCode(bytes[0], bytes[1])).toBe('PK');
    expect(sheets.map((s) => s.name)).toEqual([
      'Report',
      'BUSINESS PARAMETERS',
      'FINANCIAL RESULTS',
      'SERVICE OFFERINGS',
      'FIXED EXPENSES',
      'RESOURCES',
      'MEMBERSHIP PLANS',
      'MEMBER PROFILES',
      'PRESENTATION NOTES'
    ]);
  });

  it('holds every value the share-URL sanitizer persists', () => {
    const missing = expected.filter((v) => !cells.includes(v));
    expect(missing, 'fields absent from the workbook: ' + missing.join(' | ')).toEqual([]);
  });

  it('renders ids by name so the model is readable, and keeps numbers as numbers', () => {
    expect(cells).toContain('Rehearsal Room');
    expect(cells).toContain('Studio, "A"');
    expect(cells).toContain('Mixing & <Mastering>');
    const offerings = sheets.find((s) => s.name === 'SERVICE OFFERINGS')!;
    const prices = offerings.rows.slice(1).map((r) => r[1]);
    expect(prices).toEqual([150, 3300]);
    expect(prices.every((p) => typeof p === 'number')).toBe(true);
  });

  it('includes the financial results the old export never computed, in the scenario currency', () => {
    expect(results.revenue).toBeGreaterThan(0);
    const financial = sheets.find((s) => s.name === 'FINANCIAL RESULTS')!;
    expect(financial.rows.map((r) => r[0])).toContain('Net Profit(Loss)');
    const revenueCell = String(financial.rows[1][1]);
    expect(revenueCell).not.toContain('$');
    expect(revenueCell.replace(/\D/g, '')).toBe(String(Math.round(results.revenue)));
  });

  it('keeps the CSV and the workbook on the same sections', () => {
    const csv = buildCSV(clean, results);
    const sections = buildReportSections(clean, results).filter((s) => s.csv !== false);
    for (const s of sections) expect(csv).toContain(s.title);
    // Presentation notes are workbook-only: CSV import has nowhere to restore them
    expect(csv).not.toContain('PRESENTATION NOTES');
  });

  it('survives a read-back of the bytes the user downloads', () => {
    const roundTrip = readXLSX(bytes);
    expect(roundTrip.map((s) => s.name)).toEqual(sheets.map((s) => s.name));
    expect(roundTrip.find((s) => s.name === 'PRESENTATION NOTES')!.rows[1][0]).toBe(clean.notes);
  });
});

describe('buildXLSX / readXLSX primitives', () => {
  it('escapes XML metacharacters and restores them', () => {
    const tricky: XlsxSheet[] = [{ name: 'A & B <tag> "q" \'s\'', rows: [['a&b', 'x<y', 'q"z', "it's", 'emoji 🎙️', 'line\nbreak', 42, -1.5]] }];
    const back = readXLSX(buildXLSX(tricky));
    expect(back[0].name).toBe('A & B <tag> "q" \'s\'');
    expect(back[0].rows[0]).toEqual(['a&b', 'x<y', 'q"z', "it's", 'emoji 🎙️', 'line\nbreak', 42, -1.5]);
  });

  it('keeps sheet names legal and unique', () => {
    const made: XlsxSheet[] = [
      { name: 'ok', rows: [] },
      { name: 'ok', rows: [] },
      { name: 'bad[/\\]:*?', rows: [] },
      { name: 'x'.repeat(80), rows: [] }
    ];
    const names = readXLSX(buildXLSX(made)).map((s) => s.name);
    expect(new Set(names).size).toBe(4);
    for (const n of names) {
      expect(n.length).toBeLessThanOrEqual(31);
      expect(n).not.toMatch(/[[\]:*?/\\]/);
    }
  });

  it('round-trips sparse and empty sheets', () => {
    const sparse: XlsxSheet[] = [{ name: 'S', rows: [[, 2], ['only-a'], []] }];
    const back = readXLSX(buildXLSX(sparse))[0];
    expect(back.rows[0][1]).toBe(2);
    expect(back.rows[1][0]).toBe('only-a');
    expect(readXLSX(buildXLSX([{ name: 'Empty', rows: [] }]))[0].rows).toEqual([]);
  });
});
