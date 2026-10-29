import type { AppOffering, AppState } from '../../src/types';
import { INDUSTRY_TEMPLATES } from '../services/industryTemplates';

/** Synthetic models only. Stable IDs make screenshots and compatibility checks reproducible. */
export function fitnessFixture(): AppState {
  const config = INDUSTRY_TEMPLATES.fitness.config;
  return {
    ...structuredClone(config),
    mode: 'forecast', lockMix: false, loadedTemplate: 'fitness', currency: 'USD',
    notes: 'Example data for product-flow review. Not a business forecast.',
    processingFeePct: 0, processingFeePerTransaction: 0, transactionsPerMonth: 0,
    expenses: [], resources: [], membershipPlans: [], memberProfiles: [],
    offerings: config.offerings.map((offering, index) => ({
      ...offering, id: `fitness-${index}`, type: index === 1 ? 'group' : 'subscription'
    }))
  };
}

export function hybridFixture(): AppState {
  const names = [
    'Studio membership', 'Coaching membership', 'Weekly workshop', 'Voice coaching',
    'Recording session', 'Practice booth', 'Audition preparation', 'Editing session',
    'Demo package', 'Weekend workshop', 'Equipment rental', 'Starter kit'
  ];
  const offerings: AppOffering[] = names.map((name, index) => ({
    id: `hybrid-${index}`, name,
    type: index === 2 || index === 9 ? 'group' : index === 11 ? 'one-time' : index < 2 ? 'subscription' : 'per-session',
    priceMonthly: index === 11 ? 10 : index < 2 ? 180 + index * 60 : 240,
    sessionsPerYear: index === 11 ? 1 : index < 2 ? 24 : 48,
    hoursPerSession: index === 11 ? 0 : 1,
    variableCostPerSession: index === 11 ? 25 : 5,
    laborPctOfPrice: index === 3 ? 20 : 0,
    mixPct: index < 11 ? 8 : 12, currentClients: index === 11 ? 20 : 12,
    seats: 12, fillPct: 70, costPerRun: index === 2 || index === 9 ? 35 : 0,
    resource: index === 5 ? 'booth' : index === 4 ? 'studio' : undefined,
    confidence: index < 2 ? 'verified' : 'estimated',
    currentClientsLow: index === 11 ? 15 : 8, currentClientsHigh: index === 11 ? 30 : 16,
    sessionsPerYearLow: index === 11 ? undefined : 20,
    sessionsPerYearHigh: index === 11 ? undefined : 52,
    fillPctLow: 50, fillPctHigh: 90,
    salesLossPct: 5, salesLossPctLow: 0, salesLossPctHigh: 15
  }));
  return {
    ...fitnessFixture(), loadedTemplate: null, offerings,
    notes: 'Synthetic hybrid studio. Includes group runs, one-time sales, staff-free capacity, a purchase, and a loan.',
    processingFeePct: 2.9, processingFeePerTransaction: 0.3, transactionsPerMonth: 120,
    resources: [
      { id: 'studio', name: 'Recording room', hoursPerWeek: 30, weeksPerYear: 48 },
      { id: 'booth', name: 'Practice booth', hoursPerWeek: 20, weeksPerYear: 48, staffFree: true }
    ],
    expenses: [
      { id: 'rent', name: 'Studio rent', category: 'Rent/Lease', amount: 800, frequency: 'monthly', lifeYears: 1 },
      { id: 'purchase', name: 'Recording equipment', category: 'Equipment', amount: 2400, frequency: 'one-time', lifeYears: 3 },
      { id: 'loan', name: 'Fit-out loan', category: 'Loan Payments', amount: 6000, frequency: 'one-time', lifeYears: 3, loanAprPct: 8 }
    ]
  };
}
