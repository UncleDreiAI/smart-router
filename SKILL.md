# Smart Router Skill

Routes incoming messages to L0/L1/L2 based on complexity analysis.

## Usage

This skill automatically classifies incoming messages and dispatches them to the appropriate model tier:

- **L0** (Gemini Flash Lite): Simple acknowledgments, greetings, short commands
- **L1** (Kimi K2.5): General conversation, explanations, coding help
- **L2** (Claude 4.5): Complex reasoning, architecture, deep analysis

## Configuration

Add to your `openclaw.json`:

```json
{
  "skills": {
    "entries": {
      "smart-router": {
        "enabled": true,
        "classifier": "fast",
        "tiers": {
          "L0": "google/gemini-2.0-flash-lite",
          "L1": "moonshot/kimi-k2.5",
          "L2": "anthropic/claude-sonnet-4-5"
        }
      }
    }
  }
}
```

## Cost Savings

- Without router: ~$1.80/month (100 msgs/day @ L1)
- With router: ~$0.90/month (30% L0, 60% L1, 10% L2)
- **Savings: ~50%**
