/**
 * Reverse Calculator - "What Would It Take?" Feature
 * User enters desired annual take-home (after estimated tax); each strategy solves for the
 * change that reaches it by re-running the calc engine, so results match the main outputs.
 */

import { calc, calculateTax } from '../calculations/index';
import { formatMoney0 } from '../calculations/currency';

const BISECT_STEPS = 40;
const MAX_PRICE_MULTIPLE = 5;
const MAX_CLIENT_MULTIPLE = 20;
const MAX_FORECAST_UTILIZATION_PCT = 300;

/** Smallest x in [lo, hi] with f(x) >= target for a non-decreasing f, or null when even hi falls short. */
function solveUp(f: (x: number) => number, lo: number, hi: number, target: number): number | null {
  if (f(hi) < target) return null;
  let a = lo;
  let b = hi;
  for (let i = 0; i < BISECT_STEPS; i++) {
    const mid = (a + b) / 2;
    if (f(mid) >= target) b = mid;
    else a = mid;
  }
  return b;
}

export class ReverseCalculator {
  state: any;
  currentMetrics: any;

  constructor(state: any, currentMetrics: any) {
    this.state = state;
    this.currentMetrics = currentMetrics;
  }

  money(n: number) {
    return formatMoney0(n, this.state.currency);
  }

  private offerings(): any[] {
    return (Array.isArray(this.state.offerings) ? this.state.offerings : []).filter((o: any) => o && typeof o === 'object');
  }

  private takeHomeWith(changes: Record<string, any>): number {
    return calc({ ...this.state, ...changes }).takeHome;
  }

  private alreadyThere(desired: number) {
    return {
      feasible: true,
      message: `You already exceed your target of ${this.money(desired)}.`,
      requiresChange: false
    };
  }

  /** Common numbers for every strategy that needs a change. */
  private base(desired: number, strategy: string) {
    const current = this.currentMetrics.takeHome;
    return { currentIncome: current, desiredIncome: desired, delta: desired - current, requiresChange: true, strategy };
  }

  /**
   * Calculate required pricing to achieve desired take-home
   * @param {number} desiredTakeHome - Target annual take-home
   * @returns {Object} - Suggested price changes per offering
   */
  calculateRequiredPricing(desiredTakeHome: any) {
    if (!desiredTakeHome || desiredTakeHome <= 0) return null;
    if (this.currentMetrics.takeHome >= desiredTakeHome) return this.alreadyThere(desiredTakeHome);

    const scaled = (k: number) => this.offerings().map((o: any) => ({ ...o, priceMonthly: Math.ceil(o.priceMonthly * k) }));
    const k = solveUp((x) => this.takeHomeWith({ offerings: scaled(x) }), 1, MAX_PRICE_MULTIPLE, desiredTakeHome);
    const base = this.base(desiredTakeHome, 'pricing');

    if (k === null) {
      return {
        ...base,
        feasible: false,
        priceIncreasePct: null,
        message: `Pricing alone cannot reach ${this.money(desiredTakeHome)} take-home, even at ${MAX_PRICE_MULTIPLE}x current prices.`,
        offerings: []
      };
    }

    const suggested = scaled(k);
    const priceIncreasePct = k - 1;
    return {
      ...base,
      feasible: priceIncreasePct <= 1,
      priceIncreasePct,
      message: `Increase all service prices by ~${(priceIncreasePct * 100).toFixed(1)}% to reach ${this.money(desiredTakeHome)} take-home.`,
      offerings: this.offerings().map((o: any, i: number) => ({
        name: o.name,
        currentPrice: o.priceMonthly,
        suggestedPrice: suggested[i].priceMonthly,
        increase: suggested[i].priceMonthly - o.priceMonthly
      }))
    };
  }

  /**
   * Scales the volume lever until the target is met. Current mode scales every offering's client count;
   * Forecast mode raises target utilization, which is what sets forecast client volume.
   */
  private solveGrowth(desiredTakeHome: number) {
    const forecast = this.state.mode === 'forecast';
    if (forecast) {
      const from = Math.max(Number(this.state.targetUtilizationPct) || 0, 1);
      const u = solveUp((x) => this.takeHomeWith({ targetUtilizationPct: x }), from, MAX_FORECAST_UTILIZATION_PCT, desiredTakeHome);
      if (u === null) return null;
      const r = calc({ ...this.state, targetUtilizationPct: u });
      return { targetClients: r.clients, capacityPct: r.capacityPct };
    }
    const scaled = (k: number) => this.offerings().map((o: any) => ({ ...o, currentClients: Math.ceil((o.currentClients || 0) * k) }));
    const k = solveUp((x) => this.takeHomeWith({ offerings: scaled(x) }), 1, MAX_CLIENT_MULTIPLE, desiredTakeHome);
    if (k === null) return null;
    const r = calc({ ...this.state, offerings: scaled(k) });
    return { targetClients: r.clients, capacityPct: r.capacityPct };
  }

  /**
   * Calculate required client count to achieve desired take-home
   * @param {number} desiredTakeHome - Target annual take-home
   * @returns {Object} - Required client counts
   */
  calculateRequiredClients(desiredTakeHome: any) {
    if (!desiredTakeHome || desiredTakeHome <= 0) return null;
    if (this.currentMetrics.takeHome >= desiredTakeHome) return this.alreadyThere(desiredTakeHome);

    const { clients: currentClients, capacityPct } = this.currentMetrics;
    const base = this.base(desiredTakeHome, 'growth');
    const g = this.solveGrowth(desiredTakeHome);

    if (!g) {
      return {
        ...base,
        feasible: false,
        currentClients,
        currentCapacity: capacityPct,
        message: `More clients alone cannot reach ${this.money(desiredTakeHome)} take-home with your current pricing and costs.`,
        warning: null
      };
    }

    const additionalClientsNeeded = Math.max(0, g.targetClients - currentClients);
    return {
      ...base,
      feasible: g.capacityPct <= 100,
      currentClients,
      targetClients: g.targetClients,
      additionalClientsNeeded,
      currentCapacity: capacityPct,
      targetCapacity: g.capacityPct,
      message: `Add ~${additionalClientsNeeded} clients (from ${currentClients} to ${g.targetClients}) to reach ${this.money(desiredTakeHome)} take-home.`,
      warning: g.capacityPct > 100 ? `Warning: This would require ${g.capacityPct.toFixed(1)}% utilization` : null
    };
  }

  /**
   * Calculate required utilization to achieve desired take-home
   * @param {number} desiredTakeHome - Target annual take-home
   * @returns {Object} - Required utilization
   */
  calculateRequiredUtilization(desiredTakeHome: any) {
    if (!desiredTakeHome || desiredTakeHome <= 0) return null;
    if (this.currentMetrics.takeHome >= desiredTakeHome) return this.alreadyThere(desiredTakeHome);

    const currentCapacity = this.currentMetrics.capacityPct;
    const base = this.base(desiredTakeHome, 'utilization');
    const g = this.solveGrowth(desiredTakeHome);

    if (!g) {
      return {
        ...base,
        feasible: false,
        currentUtilization: currentCapacity,
        targetUtilization: null,
        message: `Higher utilization alone cannot reach ${this.money(desiredTakeHome)} take-home with your current pricing and costs.`,
        warning: null
      };
    }

    return {
      ...base,
      feasible: g.capacityPct <= 100,
      currentUtilization: currentCapacity,
      targetUtilization: g.capacityPct,
      message: `Increase utilization from ${currentCapacity.toFixed(1)}% to ${g.capacityPct.toFixed(1)}% to reach ${this.money(desiredTakeHome)} take-home.`,
      warning: g.capacityPct > 100 ? `Warning: This requires ${g.capacityPct.toFixed(1)}% utilization` : null
    };
  }

  /**
   * Calculate required cost reduction to achieve desired take-home
   * @param {number} desiredTakeHome - Target annual take-home
   * @returns {Object} - Required cost reductions
   */
  calculateRequiredCostReduction(desiredTakeHome: any) {
    if (!desiredTakeHome || desiredTakeHome <= 0) return null;
    if (this.currentMetrics.takeHome >= desiredTakeHome) return this.alreadyThere(desiredTakeHome);

    const { income, annualFixedCosts, variableCosts } = this.currentMetrics;
    const totalCosts = annualFixedCosts + variableCosts;
    const base = this.base(desiredTakeHome, 'costReduction');

    // Pre-tax profit needed for the target take-home, so the reduction accounts for tax
    const floor = Math.max(income, 0);
    const needed = solveUp((x) => calculateTax(x).takeHome, floor, floor + desiredTakeHome * 4 + 1e6, desiredTakeHome);
    const costReductionNeeded = Math.max(0, (needed ?? 0) - income);
    const costReductionPct = totalCosts > 0 ? (costReductionNeeded / totalCosts) * 100 : 100;
    const fixedShare = totalCosts > 0 ? annualFixedCosts / totalCosts : 0;

    return {
      ...base,
      feasible: needed !== null && costReductionNeeded <= totalCosts,
      costReductionNeeded: Math.round(costReductionNeeded),
      costReductionPct,
      fixedCostReduction: Math.round(costReductionNeeded * fixedShare),
      variableCostReduction: Math.round(costReductionNeeded * (1 - fixedShare)),
      message: `Reduce costs by ${this.money(Math.round(costReductionNeeded))} (${costReductionPct.toFixed(1)}%) to reach ${this.money(desiredTakeHome)} take-home.`,
      breakdown: {
        currentFixed: annualFixedCosts,
        currentVariable: variableCosts,
        suggestedFixed: Math.round(annualFixedCosts - costReductionNeeded * fixedShare),
        suggestedVariable: Math.round(variableCosts - costReductionNeeded * (1 - fixedShare))
      }
    };
  }

  /**
   * Get all reverse calculation results
   */
  getAllResults(desiredTakeHome: any) {
    return {
      pricing: this.calculateRequiredPricing(desiredTakeHome),
      clients: this.calculateRequiredClients(desiredTakeHome),
      utilization: this.calculateRequiredUtilization(desiredTakeHome),
      costs: this.calculateRequiredCostReduction(desiredTakeHome)
    };
  }

  /**
   * Get feasible strategies
   */
  getFeasibleStrategies(desiredTakeHome: any) {
    const results = this.getAllResults(desiredTakeHome);
    return Object.entries(results)
      .filter(([, result]) => result && result.feasible)
      .map(([key, result]) => ({
        name: key,
        ...result
      }));
  }

  /**
   * Get the easiest/most practical strategy
   */
  getRecommendedStrategy(desiredTakeHome: any) {
    const strategies = this.getFeasibleStrategies(desiredTakeHome);

    if (strategies.length === 0) {
      return null;
    }

    // Rank strategies by practicality:
    // 1. Pricing (lowest effort)
    // 2. Cost reduction (medium effort)
    // 3. Client growth (high effort)
    // 4. Utilization (high effort, requires infrastructure)

    const strategyRank = {
      pricing: 1,
      costs: 2,
      clients: 3,
      utilization: 4
    };

    return strategies.sort((a, b) => (strategyRank as any)[a.name] - (strategyRank as any)[b.name])[0];
  }
}

/**
 * Public API for reverse calculations
 */
export function getReverseCalculation(state: any, metrics: any, desiredTakeHome: any, strategyType: any = null) {
  const calculator = new ReverseCalculator(state, metrics);

  if (strategyType) {
    const cleanType = strategyType.toLowerCase();
    const methodMap = {
      'pricing': 'calculateRequiredPricing',
      'clients': 'calculateRequiredClients',
      'growth': 'calculateRequiredClients',
      'utilization': 'calculateRequiredUtilization',
      'costs': 'calculateRequiredCostReduction',
      'costreduction': 'calculateRequiredCostReduction'
    };

    const methodName = (methodMap as any)[cleanType];
    if (methodName && typeof (calculator as any)[methodName] === 'function') {
      return (calculator as any)[methodName](desiredTakeHome);
    }
  }

  return calculator.getAllResults(desiredTakeHome);
}

/**
 * Get recommended strategy
 */
export function getRecommendedStrategy(state: any, metrics: any, desiredTakeHome: any) {
  const calculator = new ReverseCalculator(state, metrics);
  return calculator.getRecommendedStrategy(desiredTakeHome);
}
