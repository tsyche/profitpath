// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

// Business model assumptions
export const HOURS_PER_YEAR = 2080; // Standard paid hours per employee per year
export const DEFAULT_CURRENCY = 'USD';

// Business logic constants
export const MIN_EMPLOYEES = 1;
export const MAX_EMPLOYEES = 1000;
export const MIN_PAY_THRESHOLD = 10000;
export const MAX_PAY_THRESHOLD = 500000;
export const MIN_UTILIZATION_WARNING = 50;
export const MAX_UTILIZATION_WARNING = 95;
export const MAX_UTILIZATION_CRITICAL = 120;
export const MIN_UTILIZATION_LOW = 50;

// UI constants
export const DEBOUNCE_DELAY = 150; // ms
export const CACHE_SIZE_LIMIT = 50;

// Accessibility constants
export const SKIP_LINK_TEXT = 'Skip to main content';

// Chart tooltip options: toggle what extra info to display
export const CHART_TOOLTIP_OPTIONS = {
  showBreakEven: true,
  showRevenue: true,
  showCosts: true,
  showProfit: true,
  showUtilization: true
};
