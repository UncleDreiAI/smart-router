// Budget and rate limit configuration (v2.0 Local-First)
const BUDGET_CONFIG = {
  // Max percentage of expensive (L2_GEN) calls per hour (prevent cost exhaustion)
  maxExpensivePercentage: 30,

  // Minimum time between expensive calls (ms) - throttle premium requests
  expensiveCooldownMs: 5000, // 5 seconds

  // Minimum requests before percentage cap applies (prevents over-throttling on low volume)
  minRequestsBeforeCap: 5,

  // Track usage
  usageWindow: 60 * 60 * 1000, // 1 hour window
};

// Expensive tiers subject to throttling
const EXPENSIVE_TIERS = ['L2_GEN'];

// Simple in-memory tracker (resets on restart)
class UsageTracker {
  constructor() {
    this.requests = [];
    this.lastExpensiveTime = 0;
  }

  record(tier) {
    const now = Date.now();

    // Clean old entries outside window
    this.requests = this.requests.filter(t => now - t.time < BUDGET_CONFIG.usageWindow);

    // Record this request
    this.requests.push({ tier, time: now });

    // Update last expensive time
    if (EXPENSIVE_TIERS.includes(tier)) {
      this.lastExpensiveTime = now;
    }
  }

  checkExpensiveAllowed() {
    const now = Date.now();

    // Clean old entries
    this.requests = this.requests.filter(t => now - t.time < BUDGET_CONFIG.usageWindow);

    // Calculate expensive tier percentage
    const expensiveCount = this.requests.filter(t => EXPENSIVE_TIERS.includes(t.tier)).length;
    const totalCount = this.requests.length || 1;
    const expensivePercentage = (expensiveCount / totalCount) * 100;

    // Check cooldown
    const cooldownRemaining = Math.max(0, BUDGET_CONFIG.expensiveCooldownMs - (now - this.lastExpensiveTime));

    // Only enforce percentage cap if we have enough requests to be meaningful
    const underCap = totalCount < BUDGET_CONFIG.minRequestsBeforeCap || expensivePercentage < BUDGET_CONFIG.maxExpensivePercentage;

    return {
      allowed: underCap && cooldownRemaining === 0,
      expensivePercentage: expensivePercentage.toFixed(1),
      cooldownRemaining,
      reason: !underCap
        ? 'Expensive tier budget exceeded'
        : (cooldownRemaining > 0 ? 'Expensive tier cooldown active' : 'OK')
    };
  }
}

module.exports = { BUDGET_CONFIG, UsageTracker };
