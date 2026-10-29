import { describe, expect, it } from 'vitest';
import { DEFAULT_VIEW, parseWorkspaceView, resolveLayout, workspaceViewKey } from '../ui/workspaceNavigation';

describe('workspace navigation', () => {
  it.each(['results', 'compare', 'model/business', 'model/offerings', 'model/costs', 'model/capacity', 'model/assumptions', 'model/offerings/service-a'])('round trips %s', key => {
    expect(workspaceViewKey(parseWorkspaceView(key))).toBe(key);
  });
  it.each([null, '', 'settings', 'model/missing', 'model/business/extra', 'model/offerings/a/b', 'model/offerings/' + 'a'.repeat(121), 'model/offerings/\u0000'])('falls back safely for %s', key => {
    expect(parseWorkspaceView(key)).toEqual(DEFAULT_VIEW);
  });
  it.each([
    ['', null, 'legacy'],
    ['', 'workspaces', 'workspaces'],
    ['', 'unknown', 'legacy'],
    ['?layout=legacy', 'workspaces', 'legacy'],
    ['?layout=workspaces', 'legacy', 'workspaces'],
    ['?layout=unknown', 'workspaces', 'workspaces'],
    ['?layout=unknown', null, 'legacy']
  ])('resolves %s with device preference %s as %s', (search, preference, expected) => {
    expect(resolveLayout(search, preference)).toBe(expected);
  });
});
