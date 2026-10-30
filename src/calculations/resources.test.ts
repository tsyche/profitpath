import { describe, it, expect, beforeEach } from 'vitest'
import { calc, clearCalculationCache } from './index'
import { activeResources, resourceAnnualHours, sanitizeResources } from './resources'

// Roadmap 20: optional capacity pools. Staff is always a pool; a tagged offering also loads its resource.
// 2 staff x 2080 x 80% = 3328 service hours; a 10 h/week x 52 booth has 520.
const base = {
  employees: 2,
  employeePay: 50000,
  monthlyCosts: 1000,
  productiveUtilizationPct: 80,
  targetUtilizationPct: 100,
}
const booth = { id: 'booth', name: 'Booth', hoursPerWeek: 10, weeksPerYear: 52 }
const offering = (extra: object = {}) => ({
  name: 'Session', priceMonthly: 100, sessionsPerYear: 12, hoursPerSession: 1, variableCostPerSession: 0,
  mixPct: 100, currentClients: 20, ...extra,
})

describe('sanitizeResources', () => {
  it('returns [] for non-arrays and drops junk rows', () => {
    for (const v of [undefined, null, 'x', 42, {}]) expect(sanitizeResources(v)).toEqual([])
    expect(sanitizeResources([null, 3, 'x'])).toEqual([])
  })

  it('clamps hours, defaults weeks to a full year and names to Resource', () => {
    const [r] = sanitizeResources([{ id: 'a', name: '  ', hoursPerWeek: 999, weeksPerYear: '' }])
    expect(r).toEqual({ id: 'a', name: 'Resource', hoursPerWeek: 168, weeksPerYear: 52 })
    const [neg] = sanitizeResources([{ id: 'b', hoursPerWeek: -5, weeksPerYear: 80 }])
    expect(neg.hoursPerWeek).toBe(0)
    expect(neg.weeksPerYear).toBe(52)
  })

  it('drops duplicate ids and the reserved staff id', () => {
    const rows = sanitizeResources([{ id: 'a' }, { id: 'a' }, { id: 'staff' }, { id: 'b' }])
    expect(rows.map((r) => r.id)).toEqual(['a', 'b'])
  })

  it('makes an id for a row that has none', () => {
    let n = 0
    expect(sanitizeResources([{ name: 'Room' }], () => `r${++n}`)[0].id).toBe('r1')
  })

  it('activeResources ignores rows with no annual hours', () => {
    const rows = activeResources([{ id: 'a', hoursPerWeek: 0 }, booth])
    expect(rows.map((r) => r.id)).toEqual(['booth'])
    expect(resourceAnnualHours(booth)).toBe(520)
  })
})

describe('capacity pools, forecast mode', () => {
  beforeEach(() => clearCalculationCache())
  const forecast = (offerings: object[], resources: object[] = [booth]) =>
    calc({ ...base, mode: 'forecast' as const, offerings, resources } as any, { enableCache: false })

  it('a tagged booth caps clients below the staff cap and becomes the bottleneck', () => {
    const staffOnly = forecast([offering()], [])
    expect(staffOnly.clients).toBe(277) // floor(3328 / 12)
    const r = forecast([offering({ resource: 'booth' })])
    expect(r.clients).toBe(43) // floor(520 / 12)
    expect(r.bottleneck.id).toBe('booth')
    expect(r.bottleneck.pct).toBeCloseTo((43 * 12 / 520) * 100, 6)
    expect(r.capacityPct).toBe(r.bottleneck.pct)
    expect(r.serviceHours).toBe(43 * 12) // staff only works the clients the booth lets through
    expect(r.poolUtilization.find((p) => p.id === 'staff')!.pct).toBeCloseTo((43 * 12 / 3328) * 100, 6)
  })

  it('only the tagged share of the mix loads the resource', () => {
    const r = forecast([offering({ resource: 'booth', mixPct: 50 }), offering({ name: 'Remote', mixPct: 50 })])
    expect(r.clients).toBe(86) // booth sees 6 h per client: floor(520 / 6)
  })

  it('a roomy resource leaves staff as the bottleneck and the totals unchanged', () => {
    const big = { ...booth, hoursPerWeek: 168 }
    const r = forecast([offering({ resource: 'booth' })], [big])
    const plain = forecast([offering()], [])
    expect(r.clients).toBe(plain.clients)
    expect(r.capacityPct).toBe(plain.capacityPct)
    expect(r.serviceHours).toBe(plain.serviceHours)
    expect(r.bottleneck.id).toBe('staff')
  })

  it('target utilization scales the resource cap', () => {
    const r = calc({ ...base, targetUtilizationPct: 50, mode: 'forecast' as const, offerings: [offering({ resource: 'booth' })], resources: [booth] } as any, { enableCache: false })
    expect(r.clients).toBe(21) // floor(260 / 12)
  })

  it('a group offering loads the resource by filled seats, not enrollment', () => {
    const g = offering({ type: 'group' as const, seats: 4, fillPct: 100, resource: 'booth' })
    const r = forecast([g])
    expect(r.clients).toBe(173) // 12 h per run / 4 seats = 3 h per client: floor(520 / 3)
  })
})

describe('capacity pools, current mode', () => {
  beforeEach(() => clearCalculationCache())
  const current = (offerings: object[], resources: object[] = [booth]) =>
    calc({ ...base, mode: 'current' as const, offerings, resources } as any, { enableCache: false })

  it('reports each pool and flags the busier one', () => {
    const r = current([offering({ resource: 'booth', currentClients: 20 })])
    expect(r.poolUtilization.map((p) => p.id)).toEqual(['staff', 'booth'])
    expect(r.poolUtilization[1].pct).toBeCloseTo((240 / 520) * 100, 6)
    expect(r.bottleneck.id).toBe('booth')
    expect(r.capacityPct).toBeGreaterThan(r.poolUtilization[0].pct)
  })

  it('can go over 100% on a resource while staff has headroom', () => {
    const r = current([offering({ resource: 'booth', currentClients: 60 })])
    expect(r.bottleneck.pct).toBeGreaterThan(100)
    expect(r.poolUtilization[0].pct).toBeLessThan(100)
  })

  it('a group needs whole cohorts of the resource', () => {
    const g = offering({ type: 'group' as const, seats: 8, resource: 'booth', currentClients: 9 })
    expect(current([g]).poolUtilization[1].pct).toBeCloseTo((24 / 520) * 100, 6) // 2 cohorts x 12 h
  })
})

describe('capacity pools, backward compatibility', () => {
  beforeEach(() => clearCalculationCache())
  const scenarios = [
    [offering()],
    [offering({ type: 'group' as const, seats: 6, fillPct: 70 })],
    [offering({ type: 'one-time' as const }), offering({ name: 'B', mixPct: 0 })],
    [offering({ mixPct: 60 }), offering({ name: 'B', mixPct: 40, hoursPerSession: 2 })],
  ]

  it.each(scenarios.map((s, i) => [i, s] as const))('scenario %i: no pools, empty pools and untagged offerings agree', (_i, offerings) => {
    for (const mode of ['forecast', 'current']) {
      const none = calc({ ...base, mode, offerings } as any, { enableCache: false })
      const empty = calc({ ...base, mode, offerings, resources: [] } as any, { enableCache: false })
      const unused = calc({ ...base, mode, offerings, resources: [booth] } as any, { enableCache: false })
      for (const r of [empty, unused]) {
        expect(r.clients).toBe(none.clients)
        expect(r.serviceHours).toBe(none.serviceHours)
        expect(r.capacityPct).toBe(none.capacityPct)
        expect(r.income).toBe(none.income)
      }
      expect(none.poolUtilization).toHaveLength(1)
      expect(none.bottleneck.id).toBe('staff')
      expect(none.bottleneck.pct).toBe(none.capacityPct)
    }
  })

  it('a tag naming an unknown or unset resource behaves as untagged', () => {
    const plain = calc({ ...base, mode: 'forecast' as const, offerings: [offering()] } as any, { enableCache: false })
    const ghost = calc({ ...base, mode: 'forecast' as const, offerings: [offering({ resource: 'nope' })], resources: [booth] } as any, { enableCache: false })
    const unset = calc({ ...base, mode: 'forecast' as const, offerings: [offering({ resource: 'booth' })], resources: [{ ...booth, hoursPerWeek: 0 }] } as any, { enableCache: false })
    expect(ghost.clients).toBe(plain.clients)
    expect(unset.clients).toBe(plain.clients)
    expect(ghost.offerings[0].resource).toBeUndefined()
  })

  it('junk resources never throw or produce non-finite output', () => {
    const junk = [null, 7, 'x', { id: 'a', hoursPerWeek: 'abc' }, { id: 'b', hoursPerWeek: 1e308, weeksPerYear: 1e308 }, { id: 'c', hoursPerWeek: NaN }]
    for (const mode of ['forecast', 'current']) {
      const r = calc({ ...base, mode, offerings: [offering({ resource: 'b' })], resources: junk } as any, { enableCache: false })
      expect(Number.isFinite(r.capacityPct)).toBe(true)
      expect(Number.isFinite(r.clients)).toBe(true)
    }
  })

  it('the cache key sees resource changes', () => {
    const args = { ...base, mode: 'forecast' as const, offerings: [offering({ resource: 'booth' })] } as any
    const a = calc({ ...args, resources: [booth] })
    const b = calc({ ...args, resources: [{ ...booth, hoursPerWeek: 20 }] })
    expect(b.clients).toBeGreaterThan(a.clients)
  })
})

describe('staff-free resources', () => {
  beforeEach(() => clearCalculationCache())
  const free = { ...booth, staffFree: true }
  const forecast = (offerings: object[], resources: object[]) =>
    calc({ ...base, mode: 'forecast' as const, offerings, resources } as any, { enableCache: false })
  const current = (offerings: object[], resources: object[]) =>
    calc({ ...base, mode: 'current' as const, offerings, resources } as any, { enableCache: false })

  it('sanitizer keeps staffFree only when true', () => {
    expect(sanitizeResources([{ id: 'a', staffFree: true }])[0].staffFree).toBe(true)
    expect(sanitizeResources([{ id: 'b', staffFree: 'yes' }])[0]).not.toHaveProperty('staffFree')
    expect(sanitizeResources([{ id: 'c', staffFree: false }])[0]).not.toHaveProperty('staffFree')
  })

  it('forecast: only the resource caps clients and staff does no work', () => {
    const r = forecast([offering({ resource: 'booth' })], [free])
    expect(r.clients).toBe(43) // floor(520 / 12), staff cap (277) no longer in play
    expect(r.serviceHours).toBe(0)
    expect(r.poolUtilization.find((p) => p.id === 'staff')!.pct).toBe(0)
    expect(r.bottleneck.id).toBe('booth')
  })

  it('forecast: a roomy staff-free resource is not capped by staff either', () => {
    const big = { ...free, hoursPerWeek: 168 } // 8736 h, more than staff's 3328
    expect(forecast([offering({ resource: 'big' })], [{ ...big, id: 'big' }]).clients).toBe(728)
  })

  it('forecast: mixed offerings, only the untagged share loads staff', () => {
    const r = forecast([offering({ resource: 'booth', mixPct: 50 }), offering({ name: 'Remote', mixPct: 50 })], [free])
    expect(r.clients).toBe(86)
    expect(r.serviceHours).toBe(86 * 6) // 6 h per client on staff, not 12
  })

  it('current: tagged clients add resource hours but no staff hours', () => {
    const r = current([offering({ resource: 'booth', currentClients: 20 })], [free])
    expect(r.serviceHours).toBe(0)
    expect(r.poolUtilization.find((p) => p.id === 'booth')!.pct).toBeCloseTo((240 / 520) * 100, 6)
    expect(r.bottleneck.id).toBe('booth')
  })

  it('an inactive (0 hours) staff-free resource is ignored, so staff still carries the hours', () => {
    const r = current([offering({ resource: 'booth', currentClients: 20 })], [{ ...free, hoursPerWeek: 0 }])
    expect(r.serviceHours).toBe(240)
  })

  it('toggling staffFree is not served from the calc cache', () => {
    const run = (r: object) => calc({ ...base, mode: 'current' as const, offerings: [offering({ resource: 'booth', currentClients: 20 })], resources: [r] } as any)
    expect(run(booth).serviceHours).toBe(240)
    expect(run(free).serviceHours).toBe(0)
  })

  it('does not change a plain resource', () => {
    const r = current([offering({ resource: 'booth', currentClients: 20 })], [booth])
    expect(r.serviceHours).toBe(240)
  })
})
