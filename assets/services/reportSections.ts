/**
 * The one place a scenario becomes report rows (roadmap 33 — Excel export parity).
 *
 * buildCSV and the Excel workbook used to be two hand-maintained copies of the
 * same table; the Excel one had drifted so far it read the retired
 * employees/employeePay fields and dropped expenses, resources, membership and
 * the financial results entirely. Both formats now render these sections, so a
 * field added here reaches the CSV and the .xlsx together.
 *
 * Cells are typed (numbers stay numbers) so the workbook can hold real numerics
 * while buildCSV stringifies. Presentation Notes is workbook-only: CSV import
 * has no place to restore it, and a free-text block could forge a section header.
 */
import type { AppOffering, AppState, CalcResult } from '../../src/types';
import { RANGE_BOUND_KEYS, rangeCaseTag } from '../../src/calculations/rangeCase';
import { normalizeOfferingType } from '../../src/calculations/index';
import { marketCsvCells } from '../../src/calculations/marketPosition';
import { normalizeConfidence, sanitizeNote } from '../../src/calculations/offeringMeta';
import { sanitizeExpenses } from '../../src/calculations/expenses';
import { sanitizeCostPerRun } from '../../src/calculations/groupRuns';
import { sanitizeResources } from '../../src/calculations/resources';
import { sanitizePlans, sanitizeProfiles } from '../../src/calculations/membership';
import { formatMoney0, normalizeCurrency } from '../../src/calculations/currency';
import type { XlsxSheet } from '../utils/xlsx';

export type ReportCell = string | number;

export interface ReportSection {
  /** Sheet/section title, e.g. 'FIXED EXPENSES'. */
  title: string;
  header: ReportCell[];
  rows: ReportCell[][];
  /** false = workbook only (see the note about free text above). */
  csv?: boolean;
}

const fmtPct1 = (n: number) => (Number.isFinite(n) ? n : 0).toFixed(1) + '%';

/** Absent bounds export as empty cells so a column is never invented on import. */
function bound(o: AppOffering, key: (typeof RANGE_BOUND_KEYS)[number]): ReportCell {
  const v = o[key];
  return v === undefined || v === null ? '' : v;
}

function marketCells(o: AppOffering): ReportCell[] {
  // marketCsvCells is the serializer the CSV import parses; keep it as the source so the two can't drift
  return marketCsvCells(o).map((v) => (v === '' ? '' : Number(v)));
}

function resourceName(o: AppOffering, resources: unknown): string {
  return sanitizeResources(resources).find((r) => r.id === o.resource)?.name || '';
}

function offeringRow(o: AppOffering, st: AppState): ReportCell[] {
  return [
    o.name,
    o.priceMonthly,
    o.sessionsPerYear,
    o.hoursPerSession,
    o.variableCostPerSession,
    o.mixPct,
    o.currentClients,
    o.laborPctOfPrice || 0,
    normalizeOfferingType(o.type),
    o.seats || 1,
    o.fillPct || 100,
    ...RANGE_BOUND_KEYS.slice(0, 4).map((k) => bound(o, k)),
    o.discountPct || 0,
    normalizeConfidence(o.confidence) || '',
    sanitizeNote(o.note) || '',
    ...marketCells(o),
    sanitizeNote(o.marketNote) || '',
    resourceName(o, st.resources),
    sanitizeCostPerRun(o.costPerRun),
    ...RANGE_BOUND_KEYS.slice(4).map((k) => bound(o, k))
  ];
}

/** Title, generated stamp and lens — the lines above the first section. */
export function reportPreamble(st: AppState): string[] {
  return [
    'ProfitPath Business Analysis Report',
    'Generated: ' + new Date().toLocaleString(),
    'Mode: ' + (st.mode === 'forecast' ? 'Forecast' : 'Current'),
    ...(rangeCaseTag() ? ['Range case: ' + rangeCaseTag()] : [])
  ];
}

export function buildReportSections(st: AppState, results: CalcResult): ReportSection[] {
  const cur = normalizeCurrency(st.currency);
  const sections: ReportSection[] = [
    {
      title: 'BUSINESS PARAMETERS',
      header: ['Parameter', 'Value', 'Unit'],
      rows: [
        ['Full-time Employees', st.fullTimeEmployees || 0, 'people'],
        ['Part-time Employees', st.partTimeEmployees || 0, 'people'],
        ['FT Annual Pay', st.fullTimeEmployeePay || 0, cur + '/yr'],
        ['PT Annual Pay', st.partTimeEmployeePay || 0, cur + '/yr'],
        ['Other Overhead', st.monthlyCosts || 0, cur + '/mo'],
        ['Processing Fee', st.processingFeePct || 0, '%'],
        ['Flat Processing Fee', st.processingFeePerTransaction || 0, cur + '/transaction'],
        ['Transactions Per Month', st.transactionsPerMonth || 0, 'transactions/mo'],
        ['Productive Utilization', st.productiveUtilizationPct || 0, '%'],
        ['Target Utilization', st.targetUtilizationPct || 0, '%'],
        ['Currency', cur, 'ISO 4217']
      ]
    },
    {
      title: 'FINANCIAL RESULTS',
      header: ['Metric', 'Value', 'Unit'],
      rows: [
        ['Total Annual Revenue', formatMoney0(results.revenue, cur), cur + '/yr'],
        ['Total Variable Costs', formatMoney0(results.variableCosts, cur), cur + '/yr'],
        ['Net Profit(Loss)', formatMoney0(results.income, cur), cur + '/yr'],
        ['Year 1 Cash Flow (before tax)', formatMoney0(results.yearOneCashFlow, cur), cur + '/yr'],
        ['Profit Margin', fmtPct1(((results.income || 0) / (results.revenue || 1)) * 100), '%'],
        ['Capacity Utilization', fmtPct1(results.capacityPct || 0), '%']
      ]
    },
    {
      title: 'SERVICE OFFERINGS',
      header: [
        'Name', 'Monthly Price', 'Sessions/yr', 'Hours/session', 'Var Cost/session', 'Mix %', 'Current Clients',
        'Labor % of price', 'Type', 'Seats', 'Fill %', 'Fill % Low', 'Fill % High', 'Clients Low', 'Clients High',
        'Best Discount %', 'Confidence', 'Note', 'Market Low', 'Market High', 'Market Avg', 'Market Note',
        'Resource', 'Cost per run', 'Sessions Low', 'Sessions High'
      ],
      rows: (st.offerings || []).map((o) => offeringRow(o, st))
    },
    {
      title: 'FIXED EXPENSES',
      header: ['Name', 'Category', 'Amount', 'Frequency', 'Life (yrs)', 'Loan APR %'],
      rows: sanitizeExpenses(st.expenses).map((e) => [e.name, e.category, e.amount, e.frequency, e.lifeYears, e.loanAprPct ?? ''])
    },
    {
      title: 'RESOURCES',
      header: ['Name', 'Hours/week', 'Weeks/year', 'Staff-free'],
      rows: sanitizeResources(st.resources).map((r) => [r.name, r.hoursPerWeek, r.weeksPerYear, r.staffFree ? 'yes' : 'no'])
    }
  ];

  // Plans and profiles carry offering names (JSON cells so any character survives); import resolves them back to ids
  const nameOf = new Map<string, string>((st.offerings || []).map((o) => [o.id, o.name] as [string, string]));
  const namesOf = (ids: string[]) => ids.map((id) => nameOf.get(id)).filter((n) => n !== undefined);
  sections.push({
    title: 'MEMBERSHIP PLANS',
    header: ['Name', 'Monthly Fee', 'Credits/month', 'Member Discount %', 'Credits At Member Price', 'Eligible Offerings', 'Included Visits/month'],
    rows: sanitizePlans(st.membershipPlans).map((p) => [
      p.name, p.monthlyFee, p.creditsPerMonth, p.memberDiscountPct,
      p.creditsAtMemberPrice ? 'yes' : 'no', JSON.stringify(namesOf(p.eligible)),
      JSON.stringify(Object.fromEntries(Object.entries(p.includedVisits || {}).filter(([id]) => nameOf.has(id)).map(([id, visits]) => [nameOf.get(id), visits])))
    ])
  });
  const byName = (v: Record<string, number> = {}) =>
    JSON.stringify(Object.fromEntries(Object.entries(v).filter(([id]) => nameOf.has(id)).map(([id, n]) => [nameOf.get(id), n])));
  sections.push({
    title: 'MEMBER PROFILES',
    header: ['Name', 'Visits/month by offering', 'Visits Low', 'Visits High'],
    rows: sanitizeProfiles(st.memberProfiles).map((p) => [
      p.name, byName(p.visits), p.visitsLow ? byName(p.visitsLow) : '', p.visitsHigh ? byName(p.visitsHigh) : ''
    ])
  });

  const notes = typeof st.notes === 'string' ? st.notes.trim() : '';
  if (notes) sections.push({ title: 'PRESENTATION NOTES', header: ['Note'], rows: [[notes]], csv: false });

  return sections;
}

/** Workbook sheets: a cover plus one sheet per section, in report order. */
export function buildWorkbookSheets(st: AppState, results: CalcResult): XlsxSheet[] {
  const sections = buildReportSections(st, results);
  return [
    { name: 'Report', rows: reportPreamble(st).map((line) => [line]) },
    ...sections.map((s) => ({ name: s.title, rows: [s.header, ...s.rows] }))
  ];
}
