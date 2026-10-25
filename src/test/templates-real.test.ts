import { describe, it, expect } from 'vitest';
import { INDUSTRY_TEMPLATES } from '../../assets/services/industryTemplates';
import { calc } from '../calculations/index';

describe('Industry templates (real data)', () => {
  it.each(Object.keys(INDUSTRY_TEMPLATES))('%s is not overbooked in Current mode', (id) => {
    const c = INDUSTRY_TEMPLATES[id].config;
    const r = calc({
      ...c,
      offerings: c.offerings.map((o, i) => ({ ...o, id: 'o' + i })),
      mode: 'current'
    } as never);
    expect(r.capacityPct).toBeLessThanOrEqual(100);
  });

  it('fitness group class is a cohort row, so hours follow runs not enrollment', () => {
    const g = INDUSTRY_TEMPLATES.fitness.config.offerings.find((o) => o.name === 'Group Fitness Classes');
    expect(g.type).toBe('group');
    expect(g.seats).toBeGreaterThan(1);
  });
});
