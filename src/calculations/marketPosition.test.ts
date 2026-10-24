import { describe, it, expect } from 'vitest'
import { marketBadge, sanitizeOfferingMarket, marketCsvCells } from './marketPosition'
import { floorStatus } from './offeringRanking'
import { sanitizeScenarioState, importFromCSV, buildCSV } from '../../assets/services/miscService'

// Roadmap 24d: green inside the range and clearing the floor, yellow near an edge or thin floor, red outside or below cost.
const range = { marketLow: 100, marketHigh: 200 }

describe('marketBadge', () => {
  it('no market numbers means no badge', () => {
    expect(marketBadge(150, {})).toBeNull()
    expect(marketBadge(150, { marketNote: 'only a note' })).toBeNull()
  })

  it('green in the middle of the range, no arrow', () => {
    expect(marketBadge(150, range)).toEqual({ level: 'green' })
  })

  it('red outside the range with the matching arrow', () => {
    expect(marketBadge(80, range)).toEqual({ level: 'red', direction: 'below' })
    expect(marketBadge(250, range)).toEqual({ level: 'red', direction: 'above' })
  })

  it('yellow within 10% of either edge, red just outside', () => {
    expect(marketBadge(109, range)).toEqual({ level: 'yellow', direction: 'below' })
    expect(marketBadge(110, range)).toEqual({ level: 'green' }) // exactly on the 10% line is clear
    expect(marketBadge(180, range)).toEqual({ level: 'green' })
    expect(marketBadge(181, range)).toEqual({ level: 'yellow', direction: 'above' })
    expect(marketBadge(99, range)?.level).toBe('red')
    expect(marketBadge(100, range)?.level).toBe('yellow') // on the edge is inside
  })

  it('floor status can only worsen the badge', () => {
    expect(marketBadge(150, range, 'thin')?.level).toBe('yellow')
    expect(marketBadge(150, range, 'loss')?.level).toBe('red')
    expect(marketBadge(80, range, 'thin')?.level).toBe('red')
  })

  it('arrow for a non-green badge inside the range follows the average', () => {
    expect(marketBadge(150, { ...range, marketAvg: 120 }, 'thin')).toEqual({ level: 'yellow', direction: 'above' })
    expect(marketBadge(150, { ...range, marketAvg: 180 }, 'thin')).toEqual({ level: 'yellow', direction: 'below' })
  })

  it('one-sided and average-only inputs work', () => {
    expect(marketBadge(50, { marketLow: 100 })).toEqual({ level: 'red', direction: 'below' })
    expect(marketBadge(500, { marketHigh: 200 })).toEqual({ level: 'red', direction: 'above' })
    expect(marketBadge(500, { marketAvg: 200 })).toEqual({ level: 'green' })
    expect(marketBadge(500, { marketAvg: 200 }, 'loss')).toEqual({ level: 'red', direction: 'above' }) // average-only must not read as below a missing low
  })

  it('swapped low/high is read as the range between them', () => {
    expect(marketBadge(150, { marketLow: 200, marketHigh: 100 })).toEqual({ level: 'green' })
  })
})

describe('floorStatus', () => {
  it('matches the headroom thresholds', () => {
    expect(floorStatus(50)).toBe('ok')
    expect(floorStatus(14.9)).toBe('thin')
    expect(floorStatus(0)).toBe('loss')
    expect(floorStatus(50, 40)).toBe('thin')
    expect(floorStatus(50, 50)).toBe('loss')
  })
})

describe('market persistence', () => {
  const base = { employees: 1, employeePay: 50000, monthlyCosts: 0, productiveUtilizationPct: 80, targetUtilizationPct: 100 }
  const off = { name: 'Yoga', priceMonthly: 100, sessionsPerYear: 12, hoursPerSession: 1, variableCostPerSession: 0, mixPct: 100, currentClients: 5 }
  const market = { ...off, marketLow: 80, marketHigh: 140, marketAvg: 110, marketNote: 'Studio X, 2026-10' }

  it('sanitizer keeps present fields and clamps junk', () => {
    expect(sanitizeOfferingMarket({ marketLow: '90', marketNote: ' a\nb ' })).toEqual({ marketLow: 90, marketNote: 'a b' })
    expect(Object.keys(sanitizeOfferingMarket({ marketLow: 'x', marketHigh: '', marketAvg: null }))).toEqual([])
    expect(sanitizeOfferingMarket({ marketHigh: -5, marketAvg: 1e99 })).toEqual({ marketHigh: 0, marketAvg: 1e9 })
    expect(marketCsvCells({ marketHigh: 5 } as any)).toEqual(['', '5', ''])
  })

  it('share-URL sanitizer keeps market fields and omits absent ones', () => {
    const o = sanitizeScenarioState({ offerings: [market, { ...off, name: 'Plain' }] })!.offerings
    expect(o[0]).toMatchObject({ marketLow: 80, marketHigh: 140, marketAvg: 110, marketNote: 'Studio X, 2026-10' })
    expect(Object.keys(o[1]).some((k) => k.startsWith('market'))).toBe(false)
  })

  it('CSV round-trips market fields as columns 19-22, including a note with commas', () => {
    const st = { ...base, mode: 'current', offerings: [market, { ...off, name: 'Plain' }], expenses: [] }
    const o = (importFromCSV(buildCSV(st, { revenue: 0, variableCosts: 0, income: 0, capacityPct: 0 })) as any).data.offerings
    expect(o[0]).toMatchObject({ marketLow: 80, marketHigh: 140, marketAvg: 110, marketNote: 'Studio X, 2026-10' })
    expect(Object.keys(o[1]).some((k) => k.startsWith('market'))).toBe(false)
  })

  it('legacy 18-column CSV rows import with no market fields', () => {
    const csv = 'Offerings\nName,P,S,H,V,M,C\nYoga,100,12,1,0,100,0'
    expect(Object.keys((importFromCSV(csv) as any).data.offerings[0]).some((k) => k.startsWith('market'))).toBe(false)
  })
})
