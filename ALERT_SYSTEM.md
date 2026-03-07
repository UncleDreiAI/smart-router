# Runaway Spending Alert System

## Overview

Real-time monitoring that detects unusual AI spending patterns and alerts you immediately via Telegram. Catches runaway costs before they become a problem.

## How It Works

Checks every **15 minutes** for:

| Alert Type | Trigger | Severity |
|------------|---------|----------|
| **Hourly Spend** | $0.50+ spent in 1 hour | 🔴 High |
| **Expensive Request** | Single request costs $0.10+ | 🟡 Medium |
| **L2 Burst** | 10+ premium requests in 1 hour | 🟡 Medium |
| **Vs Yesterday** | Spending 3x higher than yesterday | 🟠 Warning |

## Alert Cooldown

To prevent spam, each alert type has a **30-minute cooldown**. Same alert won't fire twice in 30 minutes.

## What You'll Receive

When triggered, you get an immediate Telegram message:

```
🚨 **Spending Alert: HOURLY SPEND**

💸 High hourly spending: $0.74 in the last hour

Threshold: $0.5/hour

Current: $0.736
Threshold: $0.50

⛔ Consider reviewing recent activity
```

## Configuration

### Thresholds (in `agents/router/spending-alert.js`)

```javascript
const THRESHOLDS = {
  hourlySpend: 0.50,        // $0.50/hour
  singleRequest: 0.10,      // $0.10 per request
  burstCount: 10,           // 10 L2 requests/hour
  vsYesterday: 3.0,         // 3x yesterday's spend
  alertCooldownMs: 30 * 60 * 1000,  // 30 min cooldown
};
```

### Adjust for your usage:

- **Heavy user?** Raise `hourlySpend` to $1.00 or $2.00
- **Budget conscious?** Lower `singleRequest` to $0.05
- **Getting spammed?** Increase `alertCooldownMs` to 60 minutes

## Files

```
~/.openclaw/workspace/agents/router/
├── spending-alert.js       # Core alert logic
├── check-alerts.sh         # Cron wrapper script
└── alert-state.json        # Tracks alert cooldowns (auto-created)
```

## Cron Jobs (in openclaw.json)

```json
{
  "cron": {
    "jobs": [
      {
        "name": "daily-budget-report",
        "schedule": "0 4 * * *",
        "command": "bash ~/.openclaw/workspace/agents/router/send-daily-report.sh"
      },
      {
        "name": "spending-alert-monitor", 
        "schedule": "*/15 * * * *",
        "command": "bash ~/.openclaw/workspace/agents/router/check-alerts.sh"
      }
    ]
  }
}
```

- **Daily Report:** 10 PM CST (summarizes the day)
- **Alert Monitor:** Every 15 minutes (catches runaway spending)

## Manual Testing

```bash
# Check current alert status
cd ~/.openclaw/workspace/agents/router
node spending-alert.js

# Test with fake data (triggers alerts)
node spending-alert.js --test-high-spending

# Send test alert to Telegram
bash check-alerts.sh
```

## What To Do When You Get An Alert

### 🔴 High Hourly Spend
- Check recent conversations
- Look for accidental L2 triggers (words like "design", "explain why")
- Consider temporarily disabling L2 if under attack

### 🟡 Expensive Request  
- Normal for complex coding/architecture questions
- Review if this was intentional
- Adjust threshold if too sensitive

### 🟡 L2 Burst
- Often indicates automated/scripted requests
- Check if you're in a rapid back-and-forth
- May want to add rate limiting

### 🟠 Vs Yesterday
- Context matters: busy day vs. runaway
- Check if this is expected (deadline, project work)
- Review tomorrow if pattern continues

## Kill Switch (Emergency)

If you need to immediately stop all expensive requests:

```bash
# Temporarily disable L2 tier
cd ~/.openclaw/workspace/agents/router
node -e "console.log(JSON.stringify({disabled: true, until: Date.now() + 3600000}))" > emergency-stop.json
```

Or edit `budget.js` and set:
```javascript
maxL2Percentage: 0  // Disables all L2 requests
```

## Monitoring Dashboard

View your current status anytime:

```bash
# Today's spending summary
node budget-tracker.js --report

# Current alert status  
node spending-alert.js

# Raw data
cat ~/.openclaw/data/budget-daily.jsonl | tail -20
```

## Troubleshooting

**Not receiving alerts:**
- Check cron is running: `openclaw cron status`
- Test manually: `bash check-alerts.sh`
- Verify Telegram bot token

**Too many alerts:**
- Raise thresholds in `spending-alert.js`
- Increase `alertCooldownMs` to 60 minutes
- Check if usage patterns actually changed

**Alerts not triggering:**
- Check `~/.openclaw/data/alert-state.json` for cooldowns
- Test with: `node spending-alert.js --test-high-spending`
- Verify log file has recent entries

## Integration with Smart Router

The alert system reads from the same log file as the budget tracker. Every request that goes through the router is automatically monitored.

No additional setup needed — it's all connected.
