# Smart Router Changelog

## v2.1 - OpenAI Consolidation (2026-05-05)

**Major Changes:**
- Migrated from multi-provider (Gemini/Kimi/Claude) to OpenAI-only tiers
- Added dedicated CODEX tier for all coding tasks
- Implemented batch mode eligibility for 50% cost savings on L0/L1

**New Tier Structure:**
- L0: `openai/gpt-5.4-nano` ($0.20/$1.25 input/output per 1M tokens)
- L1: `openai/gpt-5.4` ($2.50/$15.00 input/output per 1M tokens)
- L2: `openai/gpt-5.5` ($5.00/$30.00 input/output per 1M tokens)
- CODEX: `openai/gpt-5.3-codex` ($1.75/$14.00 input/output per 1M tokens)

**Routing Logic Updates:**
1. CODEX detection now highest priority (coding keywords, debug patterns, language names)
2. L2 patterns refined to focus on philosophy, reasoning, architecture (removed coding patterns)
3. L0/L1 unchanged (greetings and general conversation)

**Cost Impact:**
- Previous: ~50% savings vs. flat-rate
- Current: ~83% savings with OpenAI tiers + batch mode

**Migration Notes:**
- Direct API access (no OpenRouter unless cheaper)
- Batch mode ready but not yet implemented in dispatcher
- Budget tracking still using existing JSONL format
- Batch discount % is configurable (currently 50%, may change as OpenAI adjusts pricing)
