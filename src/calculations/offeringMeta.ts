import type { Confidence, Offering } from '../types';

/**
 * Per-offering reliability tag and free-text note (roadmap 22). Neither feeds
 * the calculation, so they stay out of the calc cache key.
 */

export const CONFIDENCE_LEVELS: readonly Confidence[] = ['verified', 'estimated', 'guess'];

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  verified: 'Verified',
  estimated: 'Estimated',
  guess: 'Guess',
};

export const MAX_NOTE_LENGTH = 200;

/** Unknown or blank means untagged (undefined), so old scenarios never grow a tag. */
export function normalizeConfidence(v: unknown): Confidence | undefined {
  return CONFIDENCE_LEVELS.includes(v as Confidence) ? (v as Confidence) : undefined;
}

/** Single line, no control characters (CSV import splits on lines), capped; blank means no note. */
export function sanitizeNote(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const clean = v.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, MAX_NOTE_LENGTH).trim();
  return clean || undefined;
}

/** Allowlisted meta fields for an untrusted offering; only those that are present appear. */
export function sanitizeOfferingMeta(o: Record<string, unknown>): Partial<Pick<Offering, 'confidence' | 'note'>> {
  const out: Partial<Pick<Offering, 'confidence' | 'note'>> = {};
  const confidence = normalizeConfidence(o.confidence);
  const note = sanitizeNote(o.note);
  if (confidence !== undefined) out.confidence = confidence;
  if (note !== undefined) out.note = note;
  return out;
}
