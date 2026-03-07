# Smart Router Integration
# Add this to your openclaw.json to enable automatic routing

## Step 1: Add the skill configuration

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

## Step 2: Channel-specific routing (WhatsApp/Telegram)

Currently OpenClaw doesn't have native "preprocessor" hooks per-channel. 

### Option A: Manual routing (implemented now)
I will internally use the router logic to switch models based on message classification.

### Option B: Session-based routing
For future OpenClaw versions, this skill can be registered as a session preprocessor.

## Current Implementation

The router lives at:
- `~/.openclaw/workspace/skills/smart-router/router.js`

Test it:
```bash
cd ~/.openclaw/workspace
node skills/smart-router/router.js "your message here"
```

## How it works

1. Message arrives (WhatsApp/Telegram)
2. Router classifies: L0, L1, or L2
3. Appropriate model handles the response
4. Cost savings: ~50% on typical usage
