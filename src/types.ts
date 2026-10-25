// Shared domain types. Phase 2 of docs/plans/typescript-migration.md.
// JS files reference these through JSDoc: @param {import('../types').Offering} o
// (path relative to the importing file). Calculation shapes mirror src/calculations/index.ts

import type { CurrencyCode } from './calculations/currency';

export type Mode = 'forecast' | 'current';

/** One-time: a single sale per client (1 delivery, no staff hours); price is per sale. */
export type OfferingType = 'subscription' | 'group' | 'per-session' | 'one-time';

export type ExpenseFrequency = 'weekly' | 'monthly' | 'annual' | 'one-time';

export type ExpenseCategory =
  | 'Rent/Lease'
  | 'Utilities'
  | 'Insurance'
  | 'Software/Subscriptions'
  | 'Marketing'
  | 'Equipment'
  | 'Loan Payments'
  | 'Professional Services'
  | 'Supplies/COGS'
  | 'Payment Processing'
  | 'Contractor/1099'
  | 'Other';

/** A fixed cost line item. monthlyCosts stays as the free-form "other overhead" on top of these. */
export interface Expense {
  id: string;
  name: string;
  category: ExpenseCategory;
  amount: number;
  frequency: ExpenseFrequency;
  /** Useful life in years; a 'one-time' purchase is spread evenly over it. Ignored for other frequencies. */
  lifeYears: number;
}

/** A membership / prepaid-credit plan for the what-if panel; display only, never used by calc. */
export interface MembershipPlan {
  id: string;
  name: string;
  monthlyFee: number;
  /** List-price dollars of credit granted each month. */
  creditsPerMonth: number;
  /** Member discount (0-100) on eligible cash purchases. */
  memberDiscountPct: number;
  /** Opt-in stacking: credits draw down at the member price instead of list. Default off. */
  creditsAtMemberPrice?: boolean;
  /** Offering ids the credits and discount apply to. */
  eligible: string[];
}

/** A typical member: visits per month by offering id. */
export interface MemberProfile {
  id: string;
  name: string;
  visits: Record<string, number>;
}

/** A capacity pool other than staff (booth, room, bay) that tagged offerings also consume. */
export interface Resource {
  id: string;
  name: string;
  hoursPerWeek: number;
  weeksPerYear: number;
  /** Tagged offerings draw no staff hours, only this pool's (self-serve booth, vending). Absent means false. */
  staffFree?: boolean;
}

/** One pool's load: staff plus each active resource. */
export interface PoolUtilization {
  id: string;
  name: string;
  pct: number;
}

/** A service offering as stored in app state (user-editable, may be partially filled). */
export interface Offering {
  id?: string;
  name?: string;
  priceMonthly?: number;
  sessionsPerYear?: number;
  hoursPerSession?: number;
  variableCostPerSession?: number;
  /** Contractor pay as % of list price (0-100), added to variable cost. */
  laborPctOfPrice?: number;
  /** Best-case discount (member, prepaid) as % of list price (0-100); only feeds the floor check, never revenue. */
  discountPct?: number;
  /** Missing or unknown values behave as 'subscription'. */
  type?: OfferingType;
  /** Group only: seats per run (>= 1). */
  seats?: number;
  /** Group only: forecast fill, % of seats taken (1-100). */
  fillPct?: number;
  /** Group only: fixed cost of one run (room, hired instructor, consumables), in dollars; 0 when absent. */
  costPerRun?: number;
  /** Optional low/high bounds for the guessable inputs; absent means no range (see calcRange). */
  fillPctLow?: number;
  fillPctHigh?: number;
  currentClientsLow?: number;
  currentClientsHigh?: number;
  /** Optional reliability tag and short note; display only, never used by calc. */
  confidence?: Confidence;
  note?: string;
  /** Optional market price range and average (same units as priceMonthly) plus a source/date note; display only. */
  marketLow?: number;
  marketHigh?: number;
  marketAvg?: number;
  marketNote?: string;
  /** Optional id of a Resource this offering also consumes (same hours as its staff time). */
  resource?: string;
  mixPct?: number;
  currentClients?: number;
}

/** How much to trust an offering's numbers. */
export type Confidence = 'verified' | 'estimated' | 'guess';

/** An offering after sanitizeOfferings(): every numeric field is a clamped finite number. */
export interface SanitizedOffering extends Offering {
  name: string;
  priceMonthly: number;
  sessionsPerYear: number;
  hoursPerSession: number;
  variableCostPerSession: number;
  laborPctOfPrice: number;
  /** Global processing fee %, stamped on by calc(); not stored on offerings. */
  feePct?: number;
  discountPct: number;
  type: OfferingType;
  seats: number;
  fillPct: number;
  costPerRun: number;
  mixPct: number;
  currentClients: number;
}

/**
 * Input to calc(). Employee fields come in two formats: the current full/part-time
 * fields, or the legacy employees/hoursPerWeek/employeePay trio.
 */
export interface CalcState {
  mode?: Mode;
  offerings?: Offering[];
  fullTimeEmployees?: number;
  partTimeEmployees?: number;
  fullTimeEmployeePay?: number;
  partTimeEmployeePay?: number;
  employees?: number;
  hoursPerWeek?: number;
  employeePay?: number;
  monthlyCosts?: number;
  /** Card/payment processing fee as a % of list-price revenue; applied as a variable cost. */
  processingFeePct?: number;
  expenses?: Expense[];
  /** Optional extra capacity pools; staff is always the implicit first pool. */
  resources?: Resource[];
  productiveUtilizationPct?: number;
  targetUtilizationPct?: number;
  /** App-only fields, ignored by calc(). */
  /** Membership what-if inputs; display only, calc() never reads them. */
  membershipPlans?: MembershipPlan[];
  memberProfiles?: MemberProfile[];
  lockMix?: boolean;
  loadedTemplate?: string | null;
  notes?: string;
  currency?: string;
}

/** An offering in app state: the UI always fills every field. */
// laborPctOfPrice, type, seats and fillPct stay optional: older saved states and templates omit them (0 / subscription / 1 / 100)
export type AppOffering = Required<Omit<Offering, 'laborPctOfPrice' | 'discountPct' | 'type' | 'seats' | 'fillPct' | 'costPerRun' | 'fillPctLow' | 'fillPctHigh' | 'currentClientsLow' | 'currentClientsHigh' | 'confidence' | 'note' | 'marketLow' | 'marketHigh' | 'marketAvg' | 'marketNote' | 'resource'>> & {
  laborPctOfPrice?: number;
  discountPct?: number;
  type?: OfferingType;
  seats?: number;
  fillPct?: number;
  costPerRun?: number;
  fillPctLow?: number;
  fillPctHigh?: number;
  currentClientsLow?: number;
  currentClientsHigh?: number;
  confidence?: Confidence;
  note?: string;
  marketLow?: number;
  marketHigh?: number;
  marketAvg?: number;
  marketNote?: string;
  resource?: string;
};

/**
 * The live app `state` global. calc() input stays CalcState because it also accepts the
 * legacy employees/hoursPerWeek/employeePay trio, which the app never sets.
 */
export type AppState = Omit<CalcState, 'offerings' | 'employees' | 'hoursPerWeek' | 'employeePay' | 'resources'> &
  Required<Omit<CalcState, 'offerings' | 'employees' | 'hoursPerWeek' | 'employeePay' | 'resources'>> & {
    offerings: AppOffering[];
    resources?: Resource[];
    /** Legacy aliases read by scenario and sensitivity UI; absent in current app state. */
    employees?: number;
    hoursPerWeek?: number;
    employeePay?: number;
  };

export interface CalcOptions {
  enableCache?: boolean;
  debug?: boolean;
}

export interface MixResult {
  sum: number;
  needsNormalization: boolean;
  shares: number[];
}

export interface CapacityParams {
  employees: number;
  productiveUtilizationPct: number;
  targetUtilizationPct: number;
  totalAnnualPaidHours?: number;
}

export interface Capacity {
  annualPaidHours: number;
  annualServiceHours: number;
  targetServiceHours: number;
}

export interface CostParams {
  employees: number;
  employeePay: number;
  monthlyCosts: number;
  /** Annualized total of expense line items, on top of monthlyCosts. */
  annualExpenses?: number;
}

export interface Costs {
  annualFixedCosts: number;
  annualPayroll: number;
  totalFixedCosts: number;
}

export interface OfferingMetric {
  name: string;
  clients: number;
  sessions: number;
  revenue: number;
  variableCosts: number;
  margin: number;
  marginPct: number;
  /** Price minus variable and labor cost for one client for one month (independent of client count). */
  contributionPerClientMonthly: number;
  /** Contribution per delivered staff hour, per client basis (independent of client count). */
  marginPerHour: number;
  /** Deepest discount (% of price) before delivery costs exceed revenue. */
  maxDiscountPct: number;
  /** Best-case discount the user entered for this offering (0 when none). */
  discountPct: number;
  /** Contribution per staff hour after the best-case discount. */
  discountedMarginPerHour: number;
  /** True when delivery uses no staff hours (one-time sales), so the per-hour figures are not meaningful. */
  hourFree?: boolean;
  /** Group rows with a run cost: seats one run needs to cover its own cost (Infinity when a seat contributes nothing). */
  breakEvenSeats?: number;
  /** The same as % of the run's seats; above 100 means the run cannot break even even when full. */
  breakEvenFillPct?: number;
}

export interface ModeResults {
  clients: number;
  totalSessions: number;
  serviceHours: number;
  /** Busiest pool's utilization (staff alone when no resources are active). */
  capacityPct: number;
  poolUtilization: PoolUtilization[];
  bottleneck: PoolUtilization;
  revenue: number;
  variableCosts: number;
  offeringMetrics: OfferingMetric[];
  mixSum: number;
  mixNormalized: boolean;
  /** Forecast mode only. */
  serviceHoursPerClient?: number;
}

export interface BreakEven {
  /** Infinity when no positive contribution margin (JSON-serializes to null). */
  breakEvenClients: number;
  breakEvenRevenue: number;
  contributionMarginPerClient: number;
  contributionMarginRatio: number;
}

export interface TaxEstimate {
  seTax: number;
  federalTax: number;
  quarterlyEst: number;
  takeHome: number;
  effectiveRate: number;
}

/** The sanitized inputs calc() derives; only present on debug results. */
export interface Sanitization {
  fullTimeEmployees: number;
  partTimeEmployees: number;
  fullTimeEmployeePay: number;
  partTimeEmployeePay: number;
  totalAnnualPaidHours: number;
  totalPayroll: number;
  employees: number;
  employeePay: number;
  monthlyCosts: number;
  processingFeePct: number;
  annualExpenses: number;
  productiveUtilizationPct: number;
  targetUtilizationPct: number;
  offerings?: SanitizedOffering[];
}

export interface CalcIntermediate {
  inputs: CalcState;
  sanitization: Partial<Sanitization>;
  capacity: Partial<Capacity>;
  costs: Partial<Costs>;
  modeResults: Partial<ModeResults>;
  breakEven: Partial<BreakEven>;
}

/** Everything calc() returns. */
export interface CalcResult extends Capacity, Costs, ModeResults, BreakEven, TaxEstimate {
  mode?: Mode;
  offerings: SanitizedOffering[];
  income: number;
  _intermediate?: CalcIntermediate;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hitRate: number;
  hits: number;
  misses: number;
  /** Formatted with toFixed(2). */
  lastCalcMs: string;
  totalCalcs: number;
}

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

/** User settings persisted under `profitpath-settings`; mirrors DEFAULT_SETTINGS in src/settings/index.js. */
export interface Settings {
  experienceLevel: ExperienceLevel;
  showAdvancedCalculations: boolean;
  showDetailedBreakdown: boolean;
  showComparisonTools: boolean;
  showExportOptions: boolean;
  showDebugPanel: boolean;
  theme: 'light' | 'dark' | 'auto';
  compactMode: boolean;
  showTooltips: boolean;
  currency: 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD';
  locale: 'en-US' | 'de-DE' | 'en-GB' | 'en-CA' | 'en-AU';
  decimalPrecision: number;
  thousandsSeparator: boolean;
  enableCaching: boolean;
  enableDebugMode: boolean;
  showPerformanceMetrics: boolean;
  showSensitivityAnalysis: boolean;
  showMixOptimizer: boolean;
  showInsights: boolean;
  showReverseCalculator: boolean;
  showAdvancedCharts: boolean;
}

/** A saved scenario in the `profitpath-scenarios` localStorage array. */
export interface Scenario {
  id: string;
  name: string;
  /** Locale-formatted display string. */
  timestamp: string;
  /** ISO 8601. */
  createdAt: string;
  state: CalcState;
  /** Written only by the miscService saveScenario variant. */
  description?: string;
  /** Pre-`state` scenarios stored the calc input here; readers fall back to it. */
  data?: CalcState;
}

/** Output of sanitizeScenarioState(): the only shape accepted from URLs, storage and imports. */
export interface SanitizedScenarioState extends CalcState {
  mode: Mode;
  offerings: SanitizedOffering[];
  fullTimeEmployees: number;
  partTimeEmployees: number;
  fullTimeEmployeePay: number;
  partTimeEmployeePay: number;
  monthlyCosts: number;
  processingFeePct?: number;
  productiveUtilizationPct: number;
  targetUtilizationPct: number;
  lockMix: boolean;
  loadedTemplate: string | null;
  notes: string;
  currency: CurrencyCode;
  expenses: Expense[];
  resources: Resource[];
  membershipPlans: MembershipPlan[];
  memberProfiles: MemberProfile[];
}
