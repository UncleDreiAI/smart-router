# Daily Budget Reporting System

## Overview

Automated daily spending reports for your AI usage. Sends a formatted summary every morning at 9 AM UTC.

## What You Get

Every day at 9 AM, you'll receive a Telegram message like:

```
📊 **Daily AI Budget Report - 2026-03-03**

💰 **Spending Today**
• Total: $0.02
• vs 7-day avg: +15% ($0.18)
• Requests: 45

📈 **Usage by Tier**
• L0 (Cheap): 20 msgs (44%) - $0.01
• L1 (Standard): 20 msgs (44%) - $0.01
• L2 (Premium): 5 msgs (11%) - $0.15

⏰ **Peak Activity**
• Busiest hour: 14:00 (12 requests)

✅ Spending on track
```

## Files

```
~/.openclaw/workspace/agents/router/
├── budget-tracker.js      # Core tracking & reporting logic
├── budget.js              # Rate limiting for L2 tier
├── dispatcher.js          # Message classification
├── send-daily-report.sh   # Cron script that sends reports
└── daily-report.sh        # Alternative manual sender

~/.openclaw/data/
└── budget-daily.jsonl     # Persistent usage log
```

## Configuration

### Cron Schedule (in openclaw.json)

```json
"cron": {
  "jobs": [
    {
      "name": "daily-budget-report",
      "schedule": "0 9 * * *",
      "command": "bash ~/.openclaw/workspace/agents/router/send-daily-report.sh",
      "enabled": true
    }
  ]
}
```

**Schedule:** 9 AM UTC daily (`0 9 * * *`)
- 3 AM CST (your timezone)
- Or change to `0 14 * * *` for 8 AM CST

### Manual Testing

```bash
# View today's report
cd ~/.openclaw/workspace/agents/router
node budget-tracker.js --report

# View as JSON
node budget-tracker.js --json

# Send report now
bash send-daily-report.sh
```

## How It Works

1. **Router Classifies** → Each message routed to L0/L1/L2
2. **Budget Tracker Logs** → Records tier, model, estimated tokens
3. **Daily Cron Runs** → 9 AM UTC generates report
4. **Report Sent** → Via Telegram to your chat

## Cost Estimation

Token estimation (rough):
- Input tokens = message length / 4
- Output tokens = input × 1.5

Actual costs may vary slightly from estimates, but trends will be accurate.

## Customization

### Change Report Time

Edit `~/.openclaw/openclaw.json`:
```json
"schedule": "0 14 * * *"  // 2 PM UTC = 8 AM CST
```

### Adjust L2 Budget

Edit `~/.openclaw/workspace/agents/router/budget.js`:
```javascript
maxL2Percentage: 30,  // Max 30% L2 calls per hour
l2CooldownMs: 5000,    // 5 second cooldown between L2
```

### View Raw Data

```bash
cat ~/.openclaw/data/budget-daily.jsonl
```

## Troubleshooting

**No report received:**
- Check cron service: `systemctl --user status openclaw-cron`
- Test manually: `bash send-daily-report.sh`
- Check Telegram bot token in script

**Wrong costs shown:**
- Token estimation is approximate
- Actual billing is per-model exact counts
- This is for trend tracking, not exact billing

**Data reset:**
- Budget log is persistent (file-based)
- Survives restarts
- 7-day history for comparison
