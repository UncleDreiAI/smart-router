# Smart Router Skill (v2.0 — Local-First)

Routes incoming messages to LOCAL/L0/L1/L2_DEV/L2_GEN based on complexity analysis. Prefers local (ollama) models, escalates coding and complex reasoning to cloud.

## Usage

This skill automatically classifies incoming messages and dispatches them to the appropriate model tier:

- **LOCAL** (ollama/phi4-mini): Local judge for docs, email, summarization, routine tasks (free)
- **L0** (ollama/gemma3:4b): Local worker for short commands, acknowledgments, creative tasks (free)
- **L1** (openai/gpt-5.4-nano): Conversational fallback when local models aren't suitable ($0.20/$1.25 per 1M tokens)
- **L2_DEV** (openai/gpt-5.3-codex): Coding tasks — debugging, scripting, refactoring ($1.75/$14.00 per 1M tokens)
- **L2_GEN** (openai/gpt-5.5): Complex reasoning, philosophy, deep analysis ($5.00/$30.00 per 1M tokens)

## Local-First Philosophy

1. **Routine tasks** (summarize, draft email, proofread) → LOCAL (phi4-mini)
2. **Short commands** (ok, thanks, status) → L0 (gemma3:4b)
3. **General conversation** → L1 (gpt-5.4-nano) when local isn't confident
4. **Coding tasks** → L2_DEV (gpt-5.3-codex) — always escalated
5. **Complex reasoning** → L2_GEN (gpt-5.5) — escalated, but throttled

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
          "LOCAL": "ollama/phi4-mini",
          "L0": "ollama/gemma3:4b",
          "L1": "openai/gpt-5.4-nano",
          "L2_DEV": "openai/gpt-5.3-codex",
          "L2_GEN": "openai/gpt-5.5"
        }
      }
    }
  }
}
```

## Cost Savings

**Without router:** ~$0.90/month (100 msgs/day @ GPT-5.4)
**With v1 router:** ~$0.30/month (40% L0, 50% L1, 8% L2, 2% CODEX)
**With v2 Local-First:** ~$0.08/month (60% local/free, 25% L1, 10% L2_DEV, 5% L2_GEN)

**Total savings: ~91%** 💰

## Routing Logic

1. **L2_DEV** (highest priority): Detects coding keywords (debug, script, javascript, python, code blocks, etc.)
2. **L2_GEN**: Philosophy, theology, architecture, deep analysis, or 500+ char messages
3. **LOCAL**: Summarize, draft email, proofread, weather, reminders
4. **L0**: Greetings, acknowledgments, very short commands (<20 chars)
5. **L1**: Everything else (general conversation default)

## Budget Protection

- L2_GEN is throttled: max 30% of hourly requests, 5-second cooldown
- Over-budget L2_GEN requests downgrade to L0 (local) instead of failing
- Daily budget tracking logs to `~/.openclaw/data/smart-router-budget.jsonl`

## Files

- `router.js` — Main entry point with security sanitization
- `lib/dispatcher.js` — Classification logic with dynamic criteria.json
- `lib/budget.js` — In-memory rate limiting for expensive tiers
- `lib/budget-tracker.js` — Persistent daily budget logging and reports
- `lib/criteria.json` — User-editable routing patterns
