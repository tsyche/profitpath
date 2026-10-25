// Industry templates for the Templates menu (loaded by miscService.loadIndustryTemplate)
export const INDUSTRY_TEMPLATES = {
  consulting: {
    name: 'Consulting Services',
    description: 'Professional consulting business',
    config: {
      offerings: [
        { name: 'Strategy Session', priceMonthly: 500, sessionsPerYear: 12, hoursPerSession: 2, variableCostPerSession: 50, mixPct: 30, currentClients: 5 },
        { name: 'Monthly Retainer', priceMonthly: 2000, sessionsPerYear: 12, hoursPerSession: 10, variableCostPerSession: 100, mixPct: 50, currentClients: 3 },
        { name: 'Project Work', priceMonthly: 3000, sessionsPerYear: 4, hoursPerSession: 20, variableCostPerSession: 200, mixPct: 20, currentClients: 2 }
      ],
      fullTimeEmployees: 1,
      partTimeEmployees: 0,
      fullTimeEmployeePay: 80000,
      partTimeEmployeePay: 30000,
      monthlyCosts: 500,
      productiveUtilizationPct: 75,
      targetUtilizationPct: 80
    }
  },
  cleaning: {
    name: 'Cleaning Services',
    description: 'Residential and commercial cleaning',
    config: {
      offerings: [
        { name: 'Weekly Cleaning', priceMonthly: 150, sessionsPerYear: 52, hoursPerSession: 2, variableCostPerSession: 20, mixPct: 60, currentClients: 15 },
        { name: 'Biweekly Cleaning', priceMonthly: 250, sessionsPerYear: 26, hoursPerSession: 3, variableCostPerSession: 30, mixPct: 30, currentClients: 10 },
        { name: 'Deep Cleaning', priceMonthly: 400, sessionsPerYear: 4, hoursPerSession: 6, variableCostPerSession: 50, mixPct: 10, currentClients: 5 }
      ],
      fullTimeEmployees: 2,
      partTimeEmployees: 0,
      fullTimeEmployeePay: 45000,
      partTimeEmployeePay: 30000,
      monthlyCosts: 300,
      productiveUtilizationPct: 85,
      targetUtilizationPct: 90
    }
  },
  fitness: {
    name: 'Fitness Services',
    description: 'Personal training and fitness coaching',
    config: {
      offerings: [
        { name: 'Personal Training Sessions', priceMonthly: 300, sessionsPerYear: 48, hoursPerSession: 1, variableCostPerSession: 0, mixPct: 60, currentClients: 24 },
        { name: 'Group Fitness Classes', type: 'group', seats: 16, fillPct: 75, costPerRun: 15, priceMonthly: 150, sessionsPerYear: 96, hoursPerSession: 0.5, variableCostPerSession: 0, mixPct: 30, currentClients: 48 },
        { name: 'Online Coaching', priceMonthly: 100, sessionsPerYear: 12, hoursPerSession: 0.1, variableCostPerSession: 0, mixPct: 10, currentClients: 60 }
      ],
      fullTimeEmployees: 1,
      partTimeEmployees: 0,
      fullTimeEmployeePay: 40000,
      partTimeEmployeePay: 30000,
      monthlyCosts: 200,
      productiveUtilizationPct: 80,
      targetUtilizationPct: 85
    }
  },
  landscaping: {
    name: 'Landscaping Services',
    description: 'Lawn care and landscaping business',
    config: {
      offerings: [
        { name: 'Weekly Lawn Care', priceMonthly: 200, sessionsPerYear: 52, hoursPerSession: 1.5, variableCostPerSession: 20, mixPct: 40, currentClients: 15 },
        { name: 'Biweekly Lawn Care', priceMonthly: 130, sessionsPerYear: 26, hoursPerSession: 1, variableCostPerSession: 15, mixPct: 30, currentClients: 10 },
        { name: 'Monthly Lawn Care', priceMonthly: 100, sessionsPerYear: 12, hoursPerSession: 1, variableCostPerSession: 15, mixPct: 20, currentClients: 8 },
        { name: 'Seasonal Lawn Care', priceMonthly: 250, sessionsPerYear: 4, hoursPerSession: 4, variableCostPerSession: 40, mixPct: 10, currentClients: 5 }
      ],
      fullTimeEmployees: 2,
      partTimeEmployees: 0,
      fullTimeEmployeePay: 35000,
      partTimeEmployeePay: 30000,
      monthlyCosts: 400,
      productiveUtilizationPct: 85,
      targetUtilizationPct: 90
    }
  },
  photography: {
    name: 'Photography Services',
    description: 'Event and portrait photography',
    config: {
      offerings: [
        { name: 'Wedding Photography', priceMonthly: 2000, sessionsPerYear: 8, hoursPerSession: 8, variableCostPerSession: 150, mixPct: 40, currentClients: 8 },
        { name: 'Portrait Sessions', priceMonthly: 300, sessionsPerYear: 12, hoursPerSession: 2, variableCostPerSession: 25, mixPct: 35, currentClients: 24 },
        { name: 'Event Photography', priceMonthly: 800, sessionsPerYear: 6, hoursPerSession: 4, variableCostPerSession: 75, mixPct: 25, currentClients: 12 }
      ],
      fullTimeEmployees: 1,
      partTimeEmployees: 0,
      fullTimeEmployeePay: 55000,
      partTimeEmployeePay: 30000,
      monthlyCosts: 300,
      productiveUtilizationPct: 75,
      targetUtilizationPct: 80
    }
  },
  handyman: {
    name: 'Handyman Services',
    description: 'General home repair and maintenance',
    config: {
      offerings: [
        { name: 'Maintenance Contracts', priceMonthly: 120, sessionsPerYear: 12, hoursPerSession: 2, variableCostPerSession: 25, mixPct: 40, currentClients: 25 },
        { name: 'Repair Services', priceMonthly: 180, sessionsPerYear: 24, hoursPerSession: 1.5, variableCostPerSession: 30, mixPct: 35, currentClients: 20 },
        { name: 'Home Improvement', priceMonthly: 300, sessionsPerYear: 8, hoursPerSession: 4, variableCostPerSession: 60, mixPct: 25, currentClients: 10 }
      ],
      fullTimeEmployees: 1,
      partTimeEmployees: 0,
      fullTimeEmployeePay: 50000,
      partTimeEmployeePay: 30000,
      monthlyCosts: 250,
      productiveUtilizationPct: 80,
      targetUtilizationPct: 85
    }
  }
};
