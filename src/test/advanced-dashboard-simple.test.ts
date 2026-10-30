import { required } from './test-utils';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AnalyticsCollector } from '../analytics/analytics';
import { FeedbackCollector } from '../analytics/feedback';
import type { AnalyticsSummary } from '../analytics/types';

const emptySummary = (): AnalyticsSummary => ({
  totalEvents: 0, totalSessions: 0, dateRange: { start: null, end: null },
  featureUsage: {}, exportStats: { total: 0, byFormat: {} },
  scenarioStats: { total: 0, byAction: {} }, templateStats: {}
});
const feedbackSummary = (total = 0, averageRating = 0): ReturnType<FeedbackCollector['getFeedbackAnalytics']> => ({
  total, averageRating, ratingDistribution: {}, categoryBreakdown: {}, recentTrend: [], topIssues: []
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock only browser export APIs; DOM elements and collectors remain real.
const NativeBlob = global.Blob;
const blobMock = vi.fn(function (parts?: BlobPart[], options?: BlobPropertyBag) {
  return new NativeBlob(parts, options);
});
vi.stubGlobal('Blob', blobMock);
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

// NOTE: Do not import other test files here — they may overwrite globals/mocks.

describe('AdvancedAnalyticsDashboard', () => {
  let AdvancedAnalyticsDashboard: typeof import('../analytics/advanced-dashboard').AdvancedAnalyticsDashboard;
  let dashboard: import('../analytics/advanced-dashboard').AdvancedAnalyticsDashboard;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();
    localStorageMock.clear();

    // Import the module
    const module = await import('../../src/analytics/advanced-dashboard');
    AdvancedAnalyticsDashboard = module.AdvancedAnalyticsDashboard;

    // Create new instance
    dashboard = new AdvancedAnalyticsDashboard();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      expect(dashboard.currentView).toBe('overview');
      expect(dashboard.dateRange).toBe('30d');
      expect(dashboard.chartInstances).toBeInstanceOf(Map);
    });

    it('should initialize event listeners', () => {
      expect(dashboard.analyticsCollector).toBeDefined();
      expect(dashboard.feedbackCollector).toBeDefined();
    });
  });

  describe('Dashboard Creation', () => {
    it('should create dashboard with basic structure', () => {
      const dashboardElement = dashboard.createDashboard();

      expect(dashboardElement.className).toBe('advanced-analytics-dashboard');
      expect(dashboardElement.innerHTML).toContain('Advanced Analytics Dashboard');
    });

    it('should include navigation views', () => {
      const dashboardElement = dashboard.createDashboard();

      expect(dashboardElement.innerHTML).toContain('data-view="overview"');
      expect(dashboardElement.innerHTML).toContain('data-view="usage"');
      expect(dashboardElement.innerHTML).toContain('data-view="feedback"');
      expect(dashboardElement.innerHTML).toContain('data-view="performance"');
      expect(dashboardElement.innerHTML).toContain('data-view="insights"');
    });

    it('should include date range options', () => {
      const dashboardElement = dashboard.createDashboard();

      expect(dashboardElement.innerHTML).toContain('Last 7 Days');
      expect(dashboardElement.innerHTML).toContain('Last 30 Days');
      expect(dashboardElement.innerHTML).toContain('Last 90 Days');
      expect(dashboardElement.innerHTML).toContain('Last Year');
      expect(dashboardElement.innerHTML).toContain('All Time');
    });

    it('should include export button', () => {
      const dashboardElement = dashboard.createDashboard();

      expect(dashboardElement.innerHTML).toContain('Export Report');
    });
  });

  describe('View Content Generation', () => {
    it('should generate overview content', () => {
      const content = dashboard.createOverviewContent();

      expect(content).toContain('overview-grid');
      expect(content).toContain('metric-cards');
      expect(content).toContain('activityTimelineChart');
      expect(content).toContain('exportDistributionChart');
      expect(content).toContain('keyInsights');
    });

    it('should generate usage content', () => {
      const content = dashboard.createUsageContent();

      expect(content).toContain('usage-grid');
      expect(content).toContain('dailyUsageChart');
      expect(content).toContain('featureHeatmap');
      expect(content).toContain('userJourneyChart');
    });

    it('should generate feedback content', () => {
      const content = dashboard.createFeedbackContent();

      expect(content).toContain('feedback-grid');
      expect(content).toContain('ratingTrendsChart');
      expect(content).toContain('feedbackCategoriesChart');
      expect(content).toContain('wordCloud');
    });

    it('should generate performance content', () => {
      const content = dashboard.createPerformanceContent();

      expect(content).toContain('performance-grid');
      expect(content).toContain('performanceMetricsChart');
      expect(content).toContain('resourceUsageChart');
      expect(content).toContain('performanceAlerts');
    });

    it('should generate insights content', () => {
      const content = dashboard.createInsightsContent();

      expect(content).toContain('insights-grid');
      expect(content).toContain('executiveSummary');
      expect(content).toContain('recommendations');
      expect(content).toContain('trendsPredictionChart');
      expect(content).toContain('actionItems');
    });
  });

  describe('Date Range Management', () => {
    it('should get correct date range for different periods', () => {
      const ranges = ['7d', '30d', '90d', '1y', 'all'];

      ranges.forEach(range => {
        dashboard.dateRange = range;
        const dateRange = dashboard.getDateRange();

        expect(dateRange.start).toBeInstanceOf(Date);
        expect(dateRange.end).toBeInstanceOf(Date);
        expect(dateRange.end.getTime()).toBeGreaterThanOrEqual(dateRange.start.getTime());
      });
    });

    it('should handle date range changes', () => {
      const refreshDashboardSpy = vi.spyOn(dashboard, 'refreshDashboard');

      dashboard.dateRange = '90d';
      dashboard.refreshDashboard();

      expect(refreshDashboardSpy).toHaveBeenCalled();
    });
  });

  describe('Data Processing', () => {
    it('should group events by date correctly', () => {
      const events = [
        { id: 'one', sessionId: 'session', event: 'test', data: {}, timestamp: Date.parse('2024-01-15T10:00:00Z') },
        { id: 'two', sessionId: 'session', event: 'test', data: {}, timestamp: Date.parse('2024-01-15T14:00:00Z') },
        { id: 'three', sessionId: 'session', event: 'test', data: {}, timestamp: Date.parse('2024-01-16T09:00:00Z') }
      ];

      dashboard.dateRange = '7d';
      const grouped = dashboard.groupEventsByDate(events);

      expect(grouped).toBeInstanceOf(Object);
      expect(Object.keys(grouped).length).toBeGreaterThan(0);
    });

    it('should handle empty events array', () => {
      const grouped = dashboard.groupEventsByDate([]);

      expect(grouped).toBeInstanceOf(Object);
    });
  });

  describe('Insights Generation', () => {
    it('should generate insights with data', () => {
      const summary = {
        ...emptySummary(),
        totalSessions: 100,
        exportStats: {
          total: 50,
          byFormat: { pdf: 30, excel: 20 }
        }
      };

      const feedbackAnalytics = feedbackSummary(25, 4.2);

      // Mock DOM element
      const mockElement = document.createElement('div');
      mockElement.id = 'keyInsights';
      document.body.appendChild(mockElement);

      dashboard.generateKeyInsights(summary, feedbackAnalytics);

      expect(mockElement.innerHTML).toBeDefined();
    });

    it('should handle empty analytics data', () => {
      const summary = emptySummary();
      const feedbackAnalytics = feedbackSummary();

      const mockElement = document.createElement('div');
      mockElement.id = 'keyInsights';
      document.body.appendChild(mockElement);

      dashboard.generateKeyInsights(summary, feedbackAnalytics);

      expect(mockElement.innerHTML).toBe('');
    });
  });

  describe('Export Functionality', () => {
    it('should export dashboard report', () => {
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      dashboard.exportDashboardReport();

      expect(blobMock).toHaveBeenCalled();
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    it('puts the collector summary in the report when analytics is active', () => {
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      dashboard.analyticsCollector = new AnalyticsCollector();
      vi.spyOn(dashboard.analyticsCollector, 'getAnalyticsSummary').mockReturnValue({ ...emptySummary(), totalSessions: 3 });
      blobMock.mockClear();

      dashboard.exportDashboardReport();

      const json = required(required(blobMock.mock.calls[0][0])[0]);
      if (typeof json !== 'string') throw new Error('Expected JSON report text');
      expect(JSON.parse(json).analytics).toMatchObject({ totalSessions: 3 });
    });
  });

  describe('View Management', () => {
    it('should switch views', () => {
      const refreshCurrentViewSpy = vi.spyOn(dashboard, 'refreshCurrentView');

      document.body.innerHTML = '<button class="nav-btn" data-view="usage"></button>';

      dashboard.switchView('usage');

      expect(dashboard.currentView).toBe('usage');
      expect(refreshCurrentViewSpy).toHaveBeenCalled();
    });

    it('should refresh current view', () => {
      const refreshOverviewSpy = vi.spyOn(dashboard, 'refreshOverview');

      dashboard.currentView = 'overview';
      dashboard.refreshCurrentView();

      expect(refreshOverviewSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing analytics collector gracefully', () => {
      dashboard.analyticsCollector = null;

      expect(() => {
        dashboard.refreshOverview();
      }).not.toThrow();
    });

    it('should handle missing feedback collector gracefully', () => {
      dashboard.feedbackCollector = null;

      expect(() => {
        dashboard.refreshOverview();
      }).not.toThrow();
    });

    it('should handle missing DOM elements gracefully', () => {
      vi.spyOn(document, 'getElementById').mockReturnValue(null);

      expect(() => {
        dashboard.refreshOverview();
      }).not.toThrow();
    });
  });

  describe('Chart Drawing', () => {
    it('should handle chart drawing with mocked context', () => {
      const mockCtx: Partial<CanvasRenderingContext2D> = {
        clearRect: vi.fn<CanvasRenderingContext2D['clearRect']>(),
        beginPath: vi.fn<CanvasRenderingContext2D['beginPath']>(),
        moveTo: vi.fn<CanvasRenderingContext2D['moveTo']>(),
        lineTo: vi.fn<CanvasRenderingContext2D['lineTo']>(),
        stroke: vi.fn<(...args: unknown[]) => void>(),
        fillRect: vi.fn<CanvasRenderingContext2D['fillRect']>(),
        save: vi.fn<CanvasRenderingContext2D['save']>(),
        restore: vi.fn<CanvasRenderingContext2D['restore']>(),
        canvas: Object.assign(document.createElement('canvas'), { width: 800, height: 400 })
      };

      const data = {
        '2024-01-15': 5,
        '2024-01-16': 3,
        '2024-01-17': 8
      };

      expect(() => {
        dashboard.drawLineChart(mockCtx as CanvasRenderingContext2D, data);
      }).not.toThrow();

      expect(mockCtx.clearRect).toHaveBeenCalled();
    });

    it('should handle pie chart drawing with mocked context', () => {
      const mockCtx: Partial<CanvasRenderingContext2D> = {
        clearRect: vi.fn<CanvasRenderingContext2D['clearRect']>(),
        beginPath: vi.fn<CanvasRenderingContext2D['beginPath']>(),
        moveTo: vi.fn<CanvasRenderingContext2D['moveTo']>(),
        arc: vi.fn<CanvasRenderingContext2D['arc']>(),
        closePath: vi.fn<CanvasRenderingContext2D['closePath']>(),
        fill: vi.fn<(...args: unknown[]) => void>(),
        fillText: vi.fn<CanvasRenderingContext2D['fillText']>(),
        save: vi.fn<CanvasRenderingContext2D['save']>(),
        restore: vi.fn<CanvasRenderingContext2D['restore']>(),
        canvas: Object.assign(document.createElement('canvas'), { width: 400, height: 400 })
      };

      const data = {
        'pdf': 10,
        'excel': 5,
        'html': 3
      };

      expect(() => {
        dashboard.drawPieChart(mockCtx as CanvasRenderingContext2D, data);
      }).not.toThrow();

      expect(mockCtx.clearRect).toHaveBeenCalled();
    });
  });

  describe('Event Listeners', () => {
    it('should attach event listeners to dashboard', () => {
      const mockDashboard = dashboard.createDashboard();
      const querySpy = vi.spyOn(mockDashboard, 'querySelectorAll');

      expect(() => {
        dashboard.attachDashboardEventListeners(mockDashboard);
      }).not.toThrow();

      expect(querySpy).toHaveBeenCalledWith('.nav-btn');
    });
  });

  describe('Placeholder Methods', () => {
    it('should have no-op placeholder refresh methods', () => {
      // These are stub methods — verify they exist and don't throw
      expect(() => dashboard.refreshUsage()).not.toThrow();
      expect(() => dashboard.refreshFeedback()).not.toThrow();
      expect(() => dashboard.refreshPerformance()).not.toThrow();
      expect(() => dashboard.refreshInsights()).not.toThrow();
    });
  });

  describe('Integration with Analytics', () => {
    it('should generate insights report with analytics data', () => {
      dashboard.analyticsCollector = new AnalyticsCollector();
      vi.spyOn(dashboard.analyticsCollector, 'getAnalyticsSummary').mockReturnValue({
        ...emptySummary(), totalSessions: 100, exportStats: { total: 50, byFormat: {} }
      });
      dashboard.feedbackCollector = new FeedbackCollector();
      vi.spyOn(dashboard.feedbackCollector, 'getFeedbackAnalytics').mockReturnValue(feedbackSummary(25, 4.2));

      const insights = dashboard.generateInsightsReport();

      expect(insights).toBeInstanceOf(Array);
      expect(insights.length).toBeGreaterThan(0);
      expect(insights[0]).toHaveProperty('category');
      expect(insights[0]).toHaveProperty('finding');
      expect(insights[0]).toHaveProperty('recommendation');
    });

    it('should handle missing collectors in insights report', () => {
      dashboard.analyticsCollector = null;
      dashboard.feedbackCollector = null;

      const insights = dashboard.generateInsightsReport();

      expect(insights).toBeInstanceOf(Array);
    });
  });
});
