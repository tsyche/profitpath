// Ambient declarations for browser globals the app attaches to `window` (or loads
// from CDN scripts). Phase 1 of docs/plans/typescript-migration.md: everything is
// `any` on purpose; Phase 2 replaces these with real types from src/types.ts.
declare global {
  // Test runner globals (vitest `globals: true`)
  var vi: any;

  // DOM helpers defined in assets/app.jsx
  var $: any;
  var $$: any;

  // Libraries loaded dynamically
  var XLSX: any;
  var html2canvas: any;
  var Chart: any;

  // App state and cross-module functions exposed on window
  var state: any;
  var calc: any;
  var render: any;
  var lastMetrics: any;
  var persistState: any;
  var updateOutputs: any;
  var updateValidationDisplay: any;
  var rebalanceMix: any;
  var showNotification: any;
  var copyToClipboard: any;
  var closeModal: any;
  var ppOpenModal: any;
  var acquireScrollLock: any;
  var releaseScrollLock: any;
  var hideContextualHelp: any;
  var defaultOfferings: any;
  var INDUSTRY_TEMPLATES: any;
  var loadIndustryTemplate: any;

  // Scenarios and comparison
  var getAllScenarios: any;
  var saveScenario: any;
  var loadScenario: any;
  var deleteScenario: any;
  var renderScenariosList: any;
  var openScenarioModal: any;
  var closeScenarioModal: any;
  var encodeScenarioToURL: any;
  var decodeScenarioFromURL: any;
  var loadScenarioFromURL: any;
  var shareComparison: any;
  var showEmbedCode: any;
  var getComparisonEmbedCode: any;
  var showScenarioComparisonDiff: any;
  var exportAsExcel: any;
  var exportComparisonAsCSV: any;
  var exportComparisonAsPDF: any;

  // Analytics and feedback
  var profitPathAnalytics: any;
  var profitPathAnalyticsUI: any;
  var AdvancedAnalyticsDashboard: any;
  var FeedbackCollector: any;
  var feedbackUI: any;

  // Set by tests / Capacitor shell
  var __TEST_MODE__: any;
  var __PP_PLATFORM__: any;
}

export {};
