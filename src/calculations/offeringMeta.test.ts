import { describe, it, expect } from 'vitest'
import { normalizeConfidence, sanitizeNote, sanitizeOfferingMeta, MAX_NOTE_LENGTH } from './offeringMeta'
import { sanitizeScenarioState, importFromCSV, buildCSV } from '../../assets/services/miscService'

const base = { employees: 1, employeePay: 50000, monthlyCosts: 0, productiveUtilizationPct: 80, targetUtilizationPct: 100 }
const off = { name: 'Yoga', priceMonthly: 100, sessionsPerYear: 12, hoursPerSession: 1, variableCostPerSession: 0, mixPct: 100, currentClients: 5 }

describe('confidence and note sanitizers (roadmap 22)', () => {
  it('unknown or blank confidence is untagged, not a default tag', () => {
    expect(normalizeConfidence('guess')).toBe('guess')
    for (const v of ['', 'GUESS', 'sure', null, undefined, 3, {}]) expect(normalizeConfidence(v)).toBeUndefined()
  })

  it('note: single line, no control chars, capped, blank is absent', () => {
    expect(sanitizeNote('  from\nthe\r\nsite\t! ')).toBe('from the site !')
    expect(sanitizeNote('x'.repeat(MAX_NOTE_LENGTH + 50))).toHaveLength(MAX_NOTE_LENGTH)
    expect(sanitizeNote('   ')).toBeUndefined()
    expect(sanitizeNote(42)).toBeUndefined()
  })

  it('sanitizeOfferingMeta keeps only present fields', () => {
    expect(sanitizeOfferingMeta({ confidence: 'verified' })).toEqual({ confidence: 'verified' })
    expect(Object.keys(sanitizeOfferingMeta({ confidence: 'nope', note: '' }))).toEqual([])
  })
})

describe('confidence and note persistence', () => {
  const tagged = { ...off, confidence: 'estimated', note: 'Quoted by "Sam", check the lease, ok?' }

  it('share-URL sanitizer keeps tags and drops junk', () => {
    const o = sanitizeScenarioState({ offerings: [tagged, { ...off, name: 'Plain', confidence: 'bogus', note: 7 }] })!.offerings
    expect(o[0]).toMatchObject({ confidence: 'estimated', note: tagged.note })
    expect(Object.keys(o[1])).not.toContain('confidence')
    expect(Object.keys(o[1])).not.toContain('note')
  })

  it('CSV round-trips tag and a note with commas and quotes', () => {
    const st = { ...base, mode: 'current', offerings: [tagged, { ...off, name: 'Plain' }], expenses: [] }
    const o = (importFromCSV(buildCSV(st, { revenue: 0, variableCosts: 0, income: 0, capacityPct: 0 })) as any).data.offerings
    expect(o[0]).toMatchObject({ confidence: 'estimated', note: tagged.note })
    expect(Object.keys(o[1])).not.toContain('confidence')
  })

  it('legacy 16-column CSV rows import untagged', () => {
    const csv = 'Offerings\nName,P,S,H,V,M,C\nYoga,100,12,1,0,100,0'
    expect(Object.keys((importFromCSV(csv) as any).data.offerings[0])).not.toContain('confidence')
  })
})
