/** Shared shapes for the local-only analytics modules. */

export interface AnalyticsSettings {
  enabled: boolean;
  trackUsage: boolean;
  trackFeatures: boolean;
  trackExports: boolean;
  trackTemplates: boolean;
  retentionDays: number;
}

export type EventData = Record<string, unknown>;

export interface AnalyticsEvent {
  id: string;
  timestamp: number;
  sessionId: string;
  event: string;
  data: EventData;
}

/** Count of events per key (feature name, export format, ...). */
export type CountMap = Record<string, number>;

export interface AnalyticsSummary {
  totalEvents: number;
  totalSessions: number;
  dateRange: { start: Date | null; end: Date | null };
  featureUsage: CountMap;
  exportStats: { total: number; byFormat: CountMap };
  scenarioStats: { total: number; byAction: CountMap };
  templateStats: CountMap;
}
