import type { Resource } from '../types';

export const STAFF_POOL_ID = 'staff';
const MAX_RESOURCES = 20;
const MAX_NAME_LENGTH = 100;
const MAX_HOURS_PER_WEEK = 168;
const MAX_WEEKS_PER_YEAR = 52;

/** Sanitizes untrusted resource rows. Ids are made unique, hours are clamped, weeks default to a full year. */
export function sanitizeResources(raw: unknown, makeId: () => string = () => ''): Resource[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>([STAFF_POOL_ID]);
  const out: Resource[] = [];
  for (const r of raw.slice(0, MAX_RESOURCES)) {
    if (!r || typeof r !== 'object') continue;
    const rec = r as Record<string, unknown>;
    const id = typeof rec.id === 'string' && rec.id ? rec.id.slice(0, 64) : makeId();
    if (!id || seen.has(id)) continue; // a duplicate or reserved id would let two pools shadow each other
    seen.add(id);
    const hours = rec.hoursPerWeek === '' || rec.hoursPerWeek == null ? NaN : Number(rec.hoursPerWeek);
    const weeks = rec.weeksPerYear === '' || rec.weeksPerYear == null ? NaN : Number(rec.weeksPerYear);
    out.push({
      id,
      name: (typeof rec.name === 'string' ? rec.name : '').trim().slice(0, MAX_NAME_LENGTH) || 'Resource',
      hoursPerWeek: Number.isFinite(hours) ? Math.min(MAX_HOURS_PER_WEEK, Math.max(0, hours)) : 0,
      weeksPerYear: Number.isFinite(weeks) ? Math.min(MAX_WEEKS_PER_YEAR, Math.max(0, weeks)) : MAX_WEEKS_PER_YEAR,
      // Only ever stored as true, so unflagged rows stay byte-identical in scenarios and share URLs
      ...(rec.staffFree === true || rec.staffFree === 'true' ? { staffFree: true } : {}),
    });
  }
  return out;
}

export function resourceAnnualHours(r: Pick<Resource, 'hoursPerWeek' | 'weeksPerYear'>): number {
  return r.hoursPerWeek * r.weeksPerYear;
}

/** A resource with no annual hours is unset: it is ignored, so a half-filled row never zeroes the forecast. */
export function activeResources(raw: unknown): Resource[] {
  return sanitizeResources(raw).filter((r) => resourceAnnualHours(r) > 0);
}
