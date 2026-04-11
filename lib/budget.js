// Budget and rate limit configuration
const BUDGET_CONFIG = {
  // Max percentage of L2 calls per hour (prevent cost exhaustion)
  maxL2Percentage: 30,
  
  // Minimum time between L2 calls (ms) - throttle expensive requests
  l2CooldownMs: 5000, // 5 seconds
  
  // Track usage
  usageWindow: 60 * 60 * 1000, // 1 hour window
};

// Simple in-memory tracker (resets on restart)
class UsageTracker {
  constructor() {
    this.requests = [];
    this.lastL2Time = 0;
  }
  
  record(tier) {
    const now = Date.now();
    
    // Clean old entries outside window
    this.requests = this.requests.filter(t => now - t.time < BUDGET_CONFIG.usageWindow);
    
    // Record this request
    this.requests.push({ tier, time: now });
    
    // Update last L2 time
    if (tier === 'L2') {
      this.lastL2Time = now;
    }
  }
  
  checkL2Allowed() {
    const now = Date.now();
    
    // Clean old entries
    this.requests = this.requests.filter(t => now - t.time < BUDGET_CONFIG.usageWindow);
    
    // Calculate L2 percentage
    const l2Count = this.requests.filter(t => t.tier === 'L2').length;
    const totalCount = this.requests.length || 1;
    const l2Percentage = (l2Count / totalCount) * 100;
    
    // Check cooldown
    const l2CooldownRemaining = Math.max(0, BUDGET_CONFIG.l2CooldownMs - (now - this.lastL2Time));
    
    return {
      allowed: l2Percentage < BUDGET_CONFIG.maxL2Percentage && l2CooldownRemaining === 0,
      l2Percentage: l2Percentage.toFixed(1),
      l2CooldownRemaining,
      reason: l2Percentage >= BUDGET_CONFIG.maxL2Percentage 
        ? 'L2 budget exceeded' 
        : (l2CooldownRemaining > 0 ? 'L2 cooldown active' : 'OK')
    };
  }
}

module.exports = { BUDGET_CONFIG, UsageTracker };
