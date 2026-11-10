import { clamp, uuid } from '../../assets/utils/helpers';
import { normalizeOfferingType } from '../calculations/index';
import { sanitizeOfferingRange } from '../calculations/ranges';
import { sanitizeOfferingMarket } from '../calculations/marketPosition';
import { sanitizeSalesLossBounds } from '../calculations/salesLoss';
import { sanitizeOfferingMeta } from '../calculations/offeringMeta';
import { sanitizeExpenses } from '../calculations/expenses';
import { sanitizeCostPerRun } from '../calculations/groupRuns';
import { sanitizeResources } from '../calculations/resources';
import { sanitizePlans, sanitizeProfiles, pruneMembership } from '../calculations/membership';
import { normalizeCurrency } from '../calculations/currency';

// Utility function to clamp values between min and max
// Coerce a value to a finite number within [min, max], or return fallback
function toFiniteNumber(value: unknown, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return clamp(n, min, max);
}

const MAX_OFFERINGS = 50;
const MAX_NAME_LENGTH = 120;

// Sanitize untrusted scenario data (from URLs, localStorage, or imports) into a
// safe state object containing only allowlisted fields with clamped values.
// Returns null if the data is not a usable scenario. Handles the legacy
// employees/employeePay format by mapping it onto fullTime fields.
/**
 * @param data - Untrusted input (URL, storage, import)
 */
export function sanitizeScenarioState(data: Record<string, unknown>): import('../types').SanitizedScenarioState | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;

  const resources = sanitizeResources(data.resources, uuid);
  const resourceIds = new Set(resources.map((r) => r.id));
  const rawOfferings = Array.isArray(data.offerings) ? data.offerings.slice(0, MAX_OFFERINGS) : [];
  const offerings = rawOfferings
    .filter((o) => o && typeof o === 'object')
    .map((o, idx) => ({
      id: typeof o.id === 'string' && o.id ? o.id.slice(0, 64) : uuid(),
      name: (typeof o.name === 'string' ? o.name : '').trim().slice(0, MAX_NAME_LENGTH) || `Offering ${idx + 1}`,
      priceMonthly: toFiniteNumber(o.priceMonthly, 100, 0, 1e9),
      sessionsPerYear: toFiniteNumber(o.sessionsPerYear, 12, 0, 100000),
      hoursPerSession: toFiniteNumber(o.hoursPerSession, 1, 0, 10000),
      variableCostPerSession: toFiniteNumber(o.variableCostPerSession, 0, 0, 1e9),
      laborPctOfPrice: toFiniteNumber(o.laborPctOfPrice, 0, 0, 100),
      discountPct: toFiniteNumber(o.discountPct, 0, 0, 100),
      salesLossPct: toFiniteNumber(o.salesLossPct, 0, 0, 100),
      ...sanitizeSalesLossBounds(o),
      type: normalizeOfferingType(o.type),
      seats: Math.floor(toFiniteNumber(o.seats, 1, 1, 100000)),
      fillPct: toFiniteNumber(o.fillPct, 100, 1, 100),
      costPerRun: sanitizeCostPerRun(o.costPerRun),
      mixPct: toFiniteNumber(o.mixPct, 0, 0, 100),
      currentClients: Math.floor(toFiniteNumber(o.currentClients, 0, 0, 1e7)),
      ...sanitizeOfferingRange(o),
      ...sanitizeOfferingMeta(o),
      ...sanitizeOfferingMarket(o),
      // A tag pointing at a resource that no longer exists is dropped
      ...(typeof o.resource === 'string' && resourceIds.has(o.resource) ? { resource: o.resource } : {})
    }));

  if (offerings.length === 0) return null;

  // Plans and profiles reference offerings by id; references to missing offerings are dropped
  const membership = pruneMembership(sanitizePlans(data.membershipPlans, uuid), sanitizeProfiles(data.memberProfiles, uuid), new Set(offerings.map((o) => o.id)));

  return {
    mode: data.mode === 'current' ? 'current' : 'forecast',
    offerings,
    fullTimeEmployees: Math.floor(toFiniteNumber(data.fullTimeEmployees ?? data.employees, 1, 0, 100000)),
    partTimeEmployees: Math.floor(toFiniteNumber(data.partTimeEmployees, 0, 0, 100000)),
    fullTimeEmployeePay: toFiniteNumber(data.fullTimeEmployeePay ?? data.employeePay, 60000, 0, 1e9),
    partTimeEmployeePay: toFiniteNumber(data.partTimeEmployeePay, 30000, 0, 1e9),
    monthlyCosts: toFiniteNumber(data.monthlyCosts, 250, 0, 1e9),
    processingFeePct: toFiniteNumber(data.processingFeePct, 0, 0, 20),
    processingFeePerTransaction: toFiniteNumber(data.processingFeePerTransaction, 0, 0, 100),
    transactionsPerMonth: toFiniteNumber(data.transactionsPerMonth, 0, 0, 1e7),
    productiveUtilizationPct: toFiniteNumber(data.productiveUtilizationPct, 80, 1, 100),
    targetUtilizationPct: toFiniteNumber(data.targetUtilizationPct, 75, 1, 150),
    lockMix: data.lockMix === true,
    loadedTemplate: typeof data.loadedTemplate === 'string' ? data.loadedTemplate.slice(0, 100) : null,
    notes: typeof data.notes === 'string' ? data.notes.slice(0, 2000) : '',
    currency: normalizeCurrency(data.currency),
    expenses: sanitizeExpenses(data.expenses, uuid),
    resources,
    membershipPlans: membership.plans,
    memberProfiles: membership.profiles
  };
}

