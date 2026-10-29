import { describe, expect, it } from 'vitest';
import { DEFAULT_VIEW, parseWorkspaceView, workspaceViewKey } from '../ui/workspaceNavigation';

describe('workspace navigation', () => {
  it.each(['results', 'compare', 'model/business', 'model/offerings', 'model/costs', 'model/capacity', 'model/assumptions', 'model/offerings/service-a'])('round trips %s', key => {
    expect(workspaceViewKey(parseWorkspaceView(key))).toBe(key);
  });
  it.each([null, '', 'settings', 'model/missing', 'model/business/extra', 'model/offerings/a/b', 'model/offerings/' + 'a'.repeat(121), 'model/offerings/\u0000'])('falls back safely for %s', key => {
    expect(parseWorkspaceView(key)).toEqual(DEFAULT_VIEW);
  });
});
