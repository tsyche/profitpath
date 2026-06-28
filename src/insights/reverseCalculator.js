/**
 * Reverse Calculator - "What Would It Take?" Feature
 * User enters desired annual take-home; app calculates required changes
 */

import { calc } from '../calculations/index.js';

export class ReverseCalculator {
  constructor(state, currentMetrics) {
    this.state = state;
    this.currentMetrics = currentMetrics;
  }

  /**
   * Calculate required pricing to achieve desired take-home
   * @param {number} desiredTakeHome - Target annual take-home
   * @returns {Object} - Suggested price changes per offering
   */
  calculateRequiredPricing(desiredTakeHome) {
    if (!desiredTakeHome || desiredTakeHome <= 0) {
      return null;
    }

    const { income: currentIncome, revenue: currentRevenue, offerings: currentOfferings } = this.currentMetrics;
    const incomeDelta = desiredTakeHome - currentIncome;

    if (incomeDelta <= 0) {
      return {
        feasible: true,
        message: `You already exceed your target of $${desiredTakeHome.toLocaleString()}.`,
        requiresChange: false
      };
    }

    // Estimate price increase needed
    // Assuming gross margin stays constant and price affects revenue proportionally
    const avgMarginPct = currentOfferings.length > 0
      ? currentOfferings.reduce((sum, o) => sum + (o.marginPct || 0), 0) / currentOfferings.length
      : 30;

    const marginRatio = avgMarginPct / 100;
    const requiredRevenueIncrease = incomeDelta / marginRatio;
    const requiredRevenuePct = (requiredRevenueIncrease / currentRevenue) * 100;
    const priceIncreasePct = requiredRevenuePct / 100;

    return {
      feasible: true,
      currentIncome: currentIncome,
      desiredIncome: desiredTakeHome,
      delta: incomeDelta,
      requiresChange: true,
      strategy: 'pricing',
      priceIncreasePct: Math.max(0, priceIncreasePct),
      priceIncreaseAmount: Math.max(0, requiredRevenueIncrease / (this.currentMetrics.totalSessions || 1)),
      message: `Increase all service prices by ~${(priceIncreasePct * 100).toFixed(1)}% to reach $${desiredTakeHome.toLocaleString()} take-home.`,
      offerings: currentOfferings.map(offering => ({
        name: offering.name,
        currentPrice: offering.priceMonthly,
        suggestedPrice: Math.round(offering.priceMonthly * (1 + priceIncreasePct)),
        increase: Math.round(offering.priceMonthly * priceIncreasePct)
      }))
    };
  }

  /**
   * Calculate required client count to achieve desired take-home
   * @param {number} desiredTakeHome - Target annual take-home
   * @returns {Object} - Required client counts
   */
  calculateRequiredClients(desiredTakeHome) {
    if (!desiredTakeHome || desiredTakeHome <= 0) {
      return null;
    }

    const { income: currentIncome, clients: currentClients, capacityPct } = this.currentMetrics;
    const incomeDelta = desiredTakeHome - currentIncome;

    if (incomeDelta <= 0) {
      return {
        feasible: true,
        message: `You already exceed your target of $${desiredTakeHome.toLocaleString()}.`,
        requiresChange: false
      };
    }

    // Estimate additional clients needed
    const incomePerClient = currentClients > 0 ? currentIncome / currentClients : 0;
    const additionalClientsNeeded = incomePerClient > 0
      ? Math.ceil(incomeDelta / incomePerClient)
      : Math.ceil((desiredTakeHome / this.currentMetrics.revenue) * 100);

    const targetClients = currentClients + additionalClientsNeeded;
    const targetCapacityPct = capacityPct * (targetClients / currentClients);

    return {
      feasible: targetCapacityPct <= 150, // Warn if over 150% capacity
      currentClients: currentClients,
      targetClients: targetClients,
      additionalClientsNeeded: additionalClientsNeeded,
      currentCapacity: capacityPct,
      targetCapacity: targetCapacityPct,
      currentIncome: currentIncome,
      desiredIncome: desiredTakeHome,
      delta: incomeDelta,
      requiresChange: true,
      strategy: 'growth',
      message: `Add ~${additionalClientsNeeded} clients (from ${currentClients} to ${targetClients}) to reach $${desiredTakeHome.toLocaleString()} take-home.`,
      warning: targetCapacityPct > 100 ? `Warning: This would require ${targetCapacityPct.toFixed(1)}% utilization` : null
    };
  }

  /**
   * Calculate required utilization to achieve desired take-home
   * @param {number} desiredTakeHome - Target annual take-home
   * @returns {Object} - Required utilization
   */
  calculateRequiredUtilization(desiredTakeHome) {
    if (!desiredTakeHome || desiredTakeHome <= 0) {
      return null;
    }

    const { income: currentIncome, capacityPct: currentCapacity, revenue: currentRevenue, fullTimeEmployees } = this.currentMetrics;
    const incomeDelta = desiredTakeHome - currentIncome;

    if (incomeDelta <= 0) {
      return {
        feasible: true,
        message: `You already exceed your target of $${desiredTakeHome.toLocaleString()}.`,
        requiresChange: false
      };
    }

    // Estimate utilization increase needed
    const incomePerUtilizationPct = currentCapacity > 0 ? currentIncome / currentCapacity : 0;
    const requiredUtilization = currentCapacity + (incomeDelta / incomePerUtilizationPct);

    return {
      feasible: requiredUtilization <= 150, // Warn if over 150%
      currentUtilization: currentCapacity,
      targetUtilization: Math.min(Math.max(requiredUtilization, 0), 200),
      currentIncome: currentIncome,
      desiredIncome: desiredTakeHome,
      delta: incomeDelta,
      requiresChange: true,
      strategy: 'utilization',
      message: `Increase utilization from ${currentCapacity.toFixed(1)}% to ${requiredUtilization.toFixed(1)}% to reach $${desiredTakeHome.toLocaleString()} take-home.`,
      warning: requiredUtilization > 100 ? `Warning: This requires ${requiredUtilization.toFixed(1)}% utilization` : null
    };
  }

  /**
   * Calculate required cost reduction to achieve desired take-home
   * @param {number} desiredTakeHome - Target annual take-home
   * @returns {Object} - Required cost reductions
   */
  calculateRequiredCostReduction(desiredTakeHome) {
    if (!desiredTakeHome || desiredTakeHome <= 0) {
      return null;
    }

    const { income: currentIncome, annualFixedCosts, variableCosts } = this.currentMetrics;
    const incomeDelta = desiredTakeHome - currentIncome;

    if (incomeDelta <= 0) {
      return {
        feasible: true,
        message: `You already exceed your target of $${desiredTakeHome.toLocaleString()}.`,
        requiresChange: false
      };
    }

    const totalCosts = annualFixedCosts + variableCosts;
    const costReductionNeeded = incomeDelta;
    const costReductionPct = (costReductionNeeded / totalCosts) * 100;

    return {
      feasible: costReductionNeeded <= totalCosts,
      currentIncome: currentIncome,
      desiredIncome: desiredTakeHome,
      delta: incomeDelta,
      requiresChange: true,
      strategy: 'costReduction',
      costReductionNeeded: Math.round(costReductionNeeded),
      costReductionPct: costReductionPct,
      fixedCostReduction: Math.round(costReductionNeeded * (annualFixedCosts / totalCosts)),
      variableCostReduction: Math.round(costReductionNeeded * (variableCosts / totalCosts)),
      message: `Reduce costs by $${Math.round(costReductionNeeded).toLocaleString()} (${costReductionPct.toFixed(1)}%) to reach $${desiredTakeHome.toLocaleString()} take-home.`,
      breakdown: {
        currentFixed: annualFixedCosts,
        currentVariable: variableCosts,
        suggestedFixed: Math.round(annualFixedCosts - (costReductionNeeded * (annualFixedCosts / totalCosts))),
        suggestedVariable: Math.round(variableCosts - (costReductionNeeded * (variableCosts / totalCosts)))
      }
    };
  }

  /**
   * Get all reverse calculation results
   */
  getAllResults(desiredTakeHome) {
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
  getFeasibleStrategies(desiredTakeHome) {
    const results = this.getAllResults(desiredTakeHome);
    return Object.entries(results)
      .filter(([key, result]) => result && result.feasible)
      .map(([key, result]) => ({
        name: key,
        ...result
      }));
  }

  /**
   * Get the easiest/most practical strategy
   */
  getRecommendedStrategy(desiredTakeHome) {
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

    return strategies.sort((a, b) => strategyRank[a.name] - strategyRank[b.name])[0];
  }
}

/**
 * Public API for reverse calculations
 */
export function getReverseCalculation(state, metrics, desiredTakeHome, strategyType = null) {
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

    const methodName = methodMap[cleanType];
    if (methodName && typeof calculator[methodName] === 'function') {
      return calculator[methodName](desiredTakeHome);
    }
  }

  return calculator.getAllResults(desiredTakeHome);
}

/**
 * Get recommended strategy
 */
export function getRecommendedStrategy(state, metrics, desiredTakeHome) {
  const calculator = new ReverseCalculator(state, metrics);
  return calculator.getRecommendedStrategy(desiredTakeHome);
}
