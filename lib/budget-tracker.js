// Daily Budget Tracker
// Persists usage data and generates daily reports

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', '..', '..', 'data');
const LOG_FILE = path.join(DATA_DIR, 'budget-daily.jsonl');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Cost per 1M tokens (input + output average)
const COST_RATES = {
  'google/gemini-2.0-flash-lite': { input: 0.10, output: 0.40 },
  'moonshot/kimi-k2.5': { input: 0.60, output: 3.00 },
  'anthropic/claude-sonnet-4-5': { input: 3.00, output: 15.00 }
};

class DailyBudgetTracker {
  constructor() {
    this.today = new Date().toISOString().split('T')[0];
  }

  // Log a request
  logRequest(tier, model, inputTokens = 0, outputTokens = 0) {
    const entry = {
      date: this.today,
      timestamp: Date.now(),
      tier,
      model,
      inputTokens,
      outputTokens,
      cost: this.calculateCost(model, inputTokens, outputTokens)
    };
    
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
    return entry;
  }

  // Calculate cost in USD
  calculateCost(model, inputTokens, outputTokens) {
    const rates = COST_RATES[model] || COST_RATES['moonshot/kimi-k2.5'];
    const inputCost = (inputTokens / 1000000) * rates.input;
    const outputCost = (outputTokens / 1000000) * rates.output;
    return inputCost + outputCost;
  }

  // Get today's summary
  getTodaySummary() {
    if (!fs.existsSync(LOG_FILE)) {
      return this.emptySummary();
    }

    const lines = fs.readFileSync(LOG_FILE, 'utf8')
      .split('\n')
      .filter(line => line.trim());
    
    const todayEntries = lines
      .map(line => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(entry => entry && entry.date === this.today);

    const summary = {
      date: this.today,
      totalRequests: todayEntries.length,
      totalCost: 0,
      byTier: { L0: { count: 0, cost: 0 }, L1: { count: 0, cost: 0 }, L2: { count: 0, cost: 0 } },
      byModel: {},
      hourly: Array(24).fill(0).map((_, i) => ({ hour: i, count: 0, cost: 0 }))
    };

    todayEntries.forEach(entry => {
      summary.totalCost += entry.cost;
      
      // By tier
      if (summary.byTier[entry.tier]) {
        summary.byTier[entry.tier].count++;
        summary.byTier[entry.tier].cost += entry.cost;
      }
      
      // By model
      if (!summary.byModel[entry.model]) {
        summary.byModel[entry.model] = { count: 0, cost: 0 };
      }
      summary.byModel[entry.model].count++;
      summary.byModel[entry.model].cost += entry.cost;
      
      // By hour
      const hour = new Date(entry.timestamp).getHours();
      summary.hourly[hour].count++;
      summary.hourly[hour].cost += entry.cost;
    });

    return summary;
  }

  // Get last 7 days for comparison
  getLast7Days() {
    if (!fs.existsSync(LOG_FILE)) return [];
    
    const lines = fs.readFileSync(LOG_FILE, 'utf8')
      .split('\n')
      .filter(line => line.trim());
    
    const entries = lines
      .map(line => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(Boolean);

    // Group by date
    const byDate = {};
    entries.forEach(entry => {
      if (!byDate[entry.date]) {
        byDate[entry.date] = { date: entry.date, cost: 0, count: 0 };
      }
      byDate[entry.date].cost += entry.cost;
      byDate[entry.date].count++;
    });

    // Get last 7 days
    const dates = Object.values(byDate)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 7);
    
    return dates;
  }

  emptySummary() {
    return {
      date: this.today,
      totalRequests: 0,
      totalCost: 0,
      byTier: { L0: { count: 0, cost: 0 }, L1: { count: 0, cost: 0 }, L2: { count: 0, cost: 0 } },
      byModel: {},
      hourly: Array(24).fill(0).map((_, i) => ({ hour: i, count: 0, cost: 0 }))
    };
  }

  // Format for display
  formatCurrency(amount) {
    if (amount < 0.01) return '<$0.01';
    return '$' + amount.toFixed(2);
  }

  formatReport() {
    const summary = this.getTodaySummary();
    const last7Days = this.getLast7Days();
    const avg7Day = last7Days.length > 1 
      ? last7Days.slice(1).reduce((a, b) => a + b.cost, 0) / (last7Days.length - 1)
      : 0;

    const l0Percent = summary.totalRequests > 0 
      ? ((summary.byTier.L0.count / summary.totalRequests) * 100).toFixed(0)
      : 0;
    const l1Percent = summary.totalRequests > 0 
      ? ((summary.byTier.L1.count / summary.totalRequests) * 100).toFixed(0)
      : 0;
    const l2Percent = summary.totalRequests > 0 
      ? ((summary.byTier.L2.count / summary.totalRequests) * 100).toFixed(0)
      : 0;

    // Find peak hour
    const peakHour = summary.hourly.reduce((max, h) => h.count > max.count ? h : max, summary.hourly[0]);

    return {
      date: summary.date,
      totalCost: summary.totalCost,
      totalRequests: summary.totalRequests,
      avg7Day: avg7Day,
      byTier: summary.byTier,
      tierPercentages: { L0: l0Percent, L1: l1Percent, L2: l2Percent },
      peakHour: peakHour.hour,
      peakCount: peakHour.count,
      formatted: this.generateTextReport(summary, avg7Day, l0Percent, l1Percent, l2Percent, peakHour)
    };
  }

  generateTextReport(summary, avg7Day, l0Percent, l1Percent, l2Percent, peakHour) {
    const vsAvg = summary.totalCost > avg7Day 
      ? `+${((summary.totalCost - avg7Day) / avg7Day * 100).toFixed(0)}%`
      : (avg7Day > 0 ? `-${((avg7Day - summary.totalCost) / avg7Day * 100).toFixed(0)}%` : '—');

    return `📊 **Daily AI Budget Report - ${summary.date}**

💰 **Spending Today**
• Total: ${this.formatCurrency(summary.totalCost)}
• vs 7-day avg: ${vsAvg} (${this.formatCurrency(avg7Day)})
• Requests: ${summary.totalRequests}

📈 **Usage by Tier**
• L0 (Cheap): ${summary.byTier.L0.count} msgs (${l0Percent}%) - ${this.formatCurrency(summary.byTier.L0.cost)}
• L1 (Standard): ${summary.byTier.L1.count} msgs (${l1Percent}%) - ${this.formatCurrency(summary.byTier.L1.cost)}
• L2 (Premium): ${summary.byTier.L2.count} msgs (${l2Percent}%) - ${this.formatCurrency(summary.byTier.L2.cost)}

⏰ **Peak Activity**
• Busiest hour: ${peakHour.hour}:00 (${peakHour.count} requests)

${summary.totalCost > avg7Day * 1.5 ? '⚠️ Spending higher than usual today' : '✅ Spending on track'}`;
  }
}

module.exports = { DailyBudgetTracker, COST_RATES };

// CLI mode
if (require.main === module) {
  const tracker = new DailyBudgetTracker();
  
  if (process.argv.includes('--report')) {
    console.log(tracker.formatReport().formatted);
  } else if (process.argv.includes('--json')) {
    console.log(JSON.stringify(tracker.formatReport(), null, 2));
  } else if (process.argv.includes('--test')) {
    // Add test data
    tracker.logRequest('L0', 'google/gemini-2.0-flash-lite', 100, 50);
    tracker.logRequest('L1', 'moonshot/kimi-k2.5', 500, 300);
    tracker.logRequest('L2', 'anthropic/claude-sonnet-4-5', 1000, 800);
    console.log('Test data added');
    console.log(tracker.formatReport().formatted);
  } else {
    console.log('Usage: node budget-tracker.js [--report|--json|--test]');
  }
}
