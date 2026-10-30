import { required } from './test-utils';
import { describe, it, expect } from 'vitest';
import { INDUSTRY_TEMPLATES } from '../../assets/services/industryTemplates';
import { calc, normalizeOfferingType } from '../calculations/index';

describe('Industry templates (real data)', () => {
  it.each(Object.entries(INDUSTRY_TEMPLATES))('%s is not overbooked in Current mode', (_id, template) => {
    const c = template.config;
    const r = calc({
      ...c,
      offerings: c.offerings.map((o, i) => ({
        ...o, id: 'o' + i, type: normalizeOfferingType('type' in o ? o.type : undefined)
      })),
      mode: 'current' as const
    });
    expect(r.capacityPct).toBeLessThanOrEqual(100);
  });

  it('fitness group class is a cohort row, so hours follow runs not enrollment', () => {
    const g = INDUSTRY_TEMPLATES.fitness.config.offerings.find((o) => o.name === 'Group Fitness Classes');
    expect(required(g).type).toBe('group');
    expect(required(g).seats).toBeGreaterThan(1);
  });
});
