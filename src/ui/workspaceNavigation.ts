/** UI preferences only. Financial state and undo history never contain navigation. */
export const MODEL_SECTIONS = ['business', 'offerings', 'costs', 'capacity', 'assumptions'] as const;
export type ModelSection = typeof MODEL_SECTIONS[number];
export interface WorkspaceView {
  workspace: 'model' | 'results' | 'compare';
  section: ModelSection;
  offeringId?: string;
}
export const DEFAULT_VIEW: WorkspaceView = { workspace: 'model', section: 'business' };

export function parseWorkspaceView(value: string | null): WorkspaceView {
  if (value === 'results' || value === 'compare') return { workspace: value, section: 'business' };
  const [workspace, section, offeringId, extra] = (value || '').split('/');
  if (workspace !== 'model' || !MODEL_SECTIONS.includes(section as ModelSection) || extra !== undefined) return { ...DEFAULT_VIEW };
  if (offeringId && (section !== 'offerings' || offeringId.length > 120 || /[\u0000-\u001f]/.test(offeringId))) return { ...DEFAULT_VIEW };
  return { workspace: 'model', section: section as ModelSection, ...(offeringId ? { offeringId } : {}) };
}

export function workspaceViewKey(view: WorkspaceView): string {
  return view.workspace === 'model' ? `model/${view.section}${view.offeringId ? '/' + view.offeringId : ''}` : view.workspace;
}

export const LAYOUT_PREFERENCE_KEY = 'profitpath-layout';
export type Layout = 'legacy' | 'workspaces';

/** Explicit links override the device preference without changing it. */
export function resolveLayout(search: string, preference: string | null): Layout {
  const requested = new URLSearchParams(search).get('layout');
  if (requested === 'legacy' || requested === 'workspaces') return requested;
  return preference === 'workspaces' ? 'workspaces' : 'legacy';
}

/** Both layouts remain available during the transition; new devices start in Classic. */
export function usesWorkspaces(): boolean {
  if (typeof window === 'undefined') return false;
  let preference: string | null = null;
  try { preference = localStorage.getItem(LAYOUT_PREFERENCE_KEY); } catch { /* Explicit links still work without storage. */ }
  return resolveLayout(window.location.search, preference) === 'workspaces';
}
