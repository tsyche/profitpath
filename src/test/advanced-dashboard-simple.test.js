import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value; },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock DOM elements
const mockElement = {
  className: '',
  innerHTML: '',
  textContent: '',
  style: {},
  addEventListener: vi.fn(),
  appendChild: vi.fn(),
  removeChild: vi.fn(),
  setAttribute: vi.fn(),
  querySelector: vi.fn(() => mockElement),
  querySelectorAll: vi.fn(() => [mockElement]),
  classList: { toggle: vi.fn() },
  dataset: { view: 'overview' }
};

// Mock document if not already defined by JSDOM
if (!window.document || !window.document.createElement) {
  Object.defineProperty(window, 'document', {
    value: {
      createElement: vi.fn(() => mockElement),
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
      getElementById: vi.fn(() => mockElement),
      querySelector: vi.fn(() => mockElement),
      querySelectorAll: vi.fn(() => [mockElement]),
      addEventListener: vi.fn()
    }
  });
}

// Mock Blob and augment global URL for export functionality
global.Blob = vi.fn(function () { return {}; });
if (typeof global.URL === 'undefined') {
  global.URL = function () { };
}
global.URL.createObjectURL = vi.fn(function () { return 'mock-url'; });
global.URL.revokeObjectURL = vi.fn();
global.URL.toString = vi.fn(function () { return '[object URL]'; });

// NOTE: Do not import other test files here — they may overwrite globals/mocks.

describe('AdvancedAnalyticsDashboard', () => {
  let AdvancedAnalyticsDashboard;
  let dashboard;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();
    localStorageMock.clear();

    // Import the module
    const module = await import('../../src/analytics/advanced-dashboard.js');
    AdvancedAnalyticsDashboard = module.default || module.AdvancedAnalyticsDashboard;

    // Create new instance
    dashboard = new AdvancedAnalyticsDashboard();
  });

  afterEach(() => {
    vi.clearAllMocks();
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
        { timestamp: '2024-01-15T10:00:00Z' },
        { timestamp: '2024-01-15T14:00:00Z' },
        { timestamp: '2024-01-16T09:00:00Z' }
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
        totalSessions: 100,
        exportStats: {
          total: 50,
          byFormat: { pdf: 30, excel: 20 }
        }
      };

      const feedbackAnalytics = {
        total: 25,
        averageRating: 4.2
      };

      // Mock DOM element
      const mockElement = { innerHTML: '' };
      document.getElementById = vi.fn(() => mockElement);

      dashboard.generateKeyInsights(summary, feedbackAnalytics);

      expect(mockElement.innerHTML).toBeDefined();
    });

    it('should handle empty analytics data', () => {
      const summary = { totalSessions: 0 };
      const feedbackAnalytics = { total: 0 };

      const mockElement = { innerHTML: '' };
      document.getElementById = vi.fn(() => mockElement);

      dashboard.generateKeyInsights(summary, feedbackAnalytics);

      expect(mockElement.innerHTML).toBe('');
    });
  });

  describe('Export Functionality', () => {
    it('should export dashboard report', () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      };

      global.document.createElement = vi.fn(() => mockLink);

      dashboard.exportDashboardReport();

      expect(global.Blob).toHaveBeenCalled();
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  describe('View Management', () => {
    it('should switch views', () => {
      const refreshCurrentViewSpy = vi.spyOn(dashboard, 'refreshCurrentView');

      // Mock nav button with dataset
      const mockNavBtn = {
        dataset: { view: 'usage' },
        classList: { toggle: vi.fn() }
      };

      document.querySelectorAll = vi.fn(() => [mockNavBtn]);

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
      document.getElementById = vi.fn(() => null);

      expect(() => {
        dashboard.refreshOverview();
      }).not.toThrow();
    });
  });

  describe('Chart Drawing', () => {
    it('should handle chart drawing with mocked context', () => {
      const mockCtx = {
        clearRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        fillRect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        canvas: { width: 800, height: 400 }
      };

      const data = {
        '2024-01-15': 5,
        '2024-01-16': 3,
        '2024-01-17': 8
      };

      expect(() => {
        dashboard.drawLineChart(mockCtx, data);
      }).not.toThrow();

      expect(mockCtx.clearRect).toHaveBeenCalled();
    });

    it('should handle pie chart drawing with mocked context', () => {
      const mockCtx = {
        clearRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        arc: vi.fn(),
        closePath: vi.fn(),
        fill: vi.fn(),
        fillText: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        canvas: { width: 400, height: 400 }
      };

      const data = {
        'pdf': 10,
        'excel': 5,
        'html': 3
      };

      expect(() => {
        dashboard.drawPieChart(mockCtx, data);
      }).not.toThrow();

      expect(mockCtx.clearRect).toHaveBeenCalled();
    });
  });

  describe('Event Listeners', () => {
    it('should attach event listeners to dashboard', () => {
      const mockDashboard = {
        querySelector: vi.fn(() => mockElement),
        querySelectorAll: vi.fn(() => [mockElement])
      };

      expect(() => {
        dashboard.attachDashboardEventListeners(mockDashboard);
      }).not.toThrow();

      expect(mockDashboard.querySelectorAll).toHaveBeenCalledWith('.nav-btn');
    });
  });

  describe('Placeholder Methods', () => {
    it('should have placeholder refresh methods', () => {
      const consoleSpy = vi.spyOn(console, 'log');

      dashboard.refreshUsage();
      dashboard.refreshFeedback();
      dashboard.refreshPerformance();
      dashboard.refreshInsights();

      expect(consoleSpy).toHaveBeenCalledWith('Refreshing usage view...');
      expect(consoleSpy).toHaveBeenCalledWith('Refreshing feedback view...');
      expect(consoleSpy).toHaveBeenCalledWith('Refreshing performance view...');
      expect(consoleSpy).toHaveBeenCalledWith('Refreshing insights view...');

      consoleSpy.mockRestore();
    });
  });

  describe('Integration with Analytics', () => {
    it('should generate insights report with analytics data', () => {
      // Mock analytics collector
      dashboard.analyticsCollector = {
        getSummary: vi.fn(() => ({
          totalSessions: 100,
          exportStats: { total: 50 }
        }))
      };

      // Mock feedback collector
      dashboard.feedbackCollector = {
        getFeedbackAnalytics: vi.fn(() => ({
          total: 25,
          averageRating: 4.2
        }))
      };

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
