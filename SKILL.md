# Smart Router Skill

Routes incoming messages to L0/L1/L2/CODEX based on complexity analysis.

## Usage

This skill automatically classifies incoming messages and dispatches them to the appropriate model tier:

- **L0** (GPT-5.4 Nano): Simple acknowledgments, greetings, short commands ($0.20/$1.25 per 1M tokens)
- **L1** (GPT-5.4): General conversation, explanations, reasoning ($2.50/$15.00 per 1M tokens)
- **L2** (GPT-5.5): Complex reasoning, philosophy, deep analysis, architecture ($5.00/$30.00 per 1M tokens)
- **CODEX** (GPT-5.3 Codex): All coding tasks - debugging, scripting, refactoring ($1.75/$14.00 per 1M tokens)

**Batch Mode:** L0 and L1 requests can use OpenAI's batch API for discounted pricing when timing allows (currently ~50% off, configurable).

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
          "L0": "openai/gpt-5.4-nano",
          "L1": "openai/gpt-5.4",
          "L2": "openai/gpt-5.5",
          "CODEX": "openai/gpt-5.3-codex"
        },
        "batch": {
          "enabled": true,
          "eligible_tiers": ["L0", "L1", "L2"],
          "discount_percent": 50,
          "max_delay_hours": 24
        }
      }
    }
  }
}
```

## Cost Savings

**Without router:** ~$0.90/month (100 msgs/day @ GPT-5.4)  
**With router:** ~$0.30/month (40% L0, 50% L1, 8% L2, 2% CODEX)  
**With batch mode:** ~$0.12/month (batch discount on L0/L1/L2)  
*Note: Batch discount % is configurable in case OpenAI adjusts pricing*  

**Total savings: ~87%** 💰

## Routing Logic

1. **CODEX** (highest priority): Detects coding keywords (debug, script, javascript, python, etc.)
2. **L2**: Philosophy, theology, architecture, deep analysis, or 400+ char messages
3. **L0**: Greetings, acknowledgments, very short commands (<15 chars)
4. **L1**: Everything else (general conversation default)
