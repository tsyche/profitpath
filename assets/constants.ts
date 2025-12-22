// ============================================================================
// CONSTANTS - Application-wide constants and configuration
// ============================================================================

export const HOURS_PER_YEAR = 2080; // Standard full-time hours per year
export const DEFAULT_CURRENCY = 'USD';

// Employee constraints
export const MIN_EMPLOYEES = 1;
export const MAX_EMPLOYEES = 100;

// Pay constraints (annual)
export const MIN_PAY_THRESHOLD = 0;
export const MAX_PAY_THRESHOLD = 500000;

// Utilization constraints
export const MIN_UTILIZATION_WARNING = 50; // Below this shows inefficiency warning
export const MAX_UTILIZATION_WARNING = 95; // Above this shows burnout warning
export const MAX_UTILIZATION_CRITICAL = 150; // Maximum allowed utilization

// Calculation constants
export const DEBOUNCE_DELAY = 300; // ms - Delay for input debouncing
export const CACHE_SIZE_LIMIT = 100; // Maximum cached calculation results

// Default offerings (used when no offerings exist)
export const DEFAULT_OFFERINGS = [
  {
    id: 'default-1',
    name: 'Basic Service',
    priceMonthly: 1200,
    sessionsPerYear: 12,
    hoursPerSession: 2,
    variableCostPerSession: 50,
    mixPct: 50,
    currentClients: 0,
  },
  {
    id: 'default-2',
    name: 'Premium Service',
    priceMonthly: 2500,
    sessionsPerYear: 12,
    hoursPerSession: 4,
    variableCostPerSession: 100,
    mixPct: 50,
    currentClients: 0,
  },
] as const;
