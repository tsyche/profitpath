// Ambient declarations for browser globals the app attaches to `window` (or loads
// from CDN scripts). Phase 1 of docs/plans/typescript-migration.md: everything is
// `any` until typed; Phase 2 replaces them with real types from src/types.ts as the
// shapes are verified against the code.
declare global {
  // Injected from package.json by Vite `define`
  const __APP_VERSION__: string;

  // Test runner globals (vitest `globals: true`)
  var vi: typeof import('vitest').vi;

  // DOM helpers defined in assets/utils/dom.ts
  var $: any;
  var $$: any;

  // Libraries loaded dynamically
  var XLSX: any;
  var html2canvas: any;
  var Chart: any;

  // App state and cross-module functions exposed on window
  var state: import('./types').AppState;
  var calc: (state?: import('./types').CalcState, options?: import('./types').CalcOptions) => import('./types').CalcResult;
  var render: any;
  var lastMetrics: import('./types').CalcResult | null | undefined;
  var persistState: any;
  var updateOutputs: any;
  var updateValidationDisplay: any;
  var rebalanceMix: any;
  var showNotification: any;
  var copyToClipboard: any;
  var closeModal: any;
  var ppOpenModal: any;
  var ppCloseModal: any;
  var openWhatIfWizard: () => void;
  var acquireScrollLock: any;
  var releaseScrollLock: any;
  var hideContextualHelp: any;
  var defaultOfferings: () => import('./types').Offering[];
  var INDUSTRY_TEMPLATES: any;
  var loadIndustryTemplate: any;

  // Scenarios and comparison
  var getAllScenarios: () => import('./types').Scenario[];
  var saveScenario: any;
  var loadScenario: (scenarioId: string) => void;
  var deleteScenario: (scenarioId: string) => void;
  var renderScenariosList: any;
  var openScenarioModal: any;
  var closeScenarioModal: any;
  var encodeScenarioToURL: (state: import('./types').CalcState, options?: { readonly?: boolean }) => string | null;
  var decodeScenarioFromURL: () => unknown;
  var loadScenarioFromURL: any;
  var shareComparison: any;
  var showEmbedCode: any;
  var getComparisonEmbedCode: any;
  var showScenarioComparisonDiff: any;
  var exportAsExcel: any;
  var exportComparisonAsCSV: any;
  var exportComparisonAsPDF: any;

  // Analytics and feedback
  var profitPathAnalytics: import('./analytics/analytics').AnalyticsCollector;
  var profitPathAnalyticsUI: import('./analytics/analytics-ui').AnalyticsUI;
  var FeedbackCollector: typeof import('./analytics/feedback').FeedbackCollector;
  var AdvancedAnalyticsDashboard: typeof import('./analytics/advanced-dashboard').AdvancedAnalyticsDashboard;
  var feedbackUI: import('./analytics/feedback-ui').FeedbackUI;

  // Set by tests / Capacitor shell
  var __TEST_MODE__: any;
  var __PP_PLATFORM__: any;
}

export {};
