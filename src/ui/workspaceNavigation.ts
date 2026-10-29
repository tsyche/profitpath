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

/** Temporary opt-in while the old shell remains available for cutover acceptance. */
export function usesWorkspaces(): boolean {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('layout') === 'workspaces';
}
