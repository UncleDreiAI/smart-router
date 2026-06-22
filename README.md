# Smart Router

Local-First tiered routing system for AI model selection in OpenClaw.

Repo: https://github.com/UncleDreiAI/smart-router

## Tiers

| Tier | Model | Purpose |
|------|-------|---------|
| LOCAL | ollama/phi4-mini | Local judge for docs/email/routine |
| L0 | ollama/gemma3:4b | Local creative/routine worker |
| L1 | openai/gpt-5.4-nano | Conversational |
| L2_DEV | openai/gpt-5.3-codex | Coding tasks |
| L2_GEN | openai/gpt-5.5 | Complex reasoning |

## Usage

```bash
node router.js "your message here"
node router.js --test
```

## Install (as OpenClaw plugin)

```bash
./install.sh
```

## Architecture

- Local-First: requests route through local judge unless coding/complex
- Escalation: local models escalate to cloud tiers when needed
- Sanitized: no message content logged, only metadata
- Throttled: L2_GEN capped at 30% hourly + 5s cooldown; over-budget downgrades to L0

## Docs

- `SKILL.md` — skill manifest
- `INTEGRATION.md` — wiring into OpenClaw
- `BUDGET_REPORTING.md` — daily cost reports
- `ALERT_SYSTEM.md` — runaway spending alerts
- `SECURITY.md` — sanitization model

## License

MIT
