# Smart Router for OpenClaw

<p align="center">
  <strong>🚦 Intelligent Model Routing</strong><br>
  Automatically route queries to L0/L1/L2 models based on complexity.<br>
  <strong>Saves ~50% on typical API usage.</strong>
</p>

<p align="center">
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#routing-logic">Routing</a>
</p>

---

## Features

- 🎯 **Automatic Classification** - Analyzes every query and routes to the right tier
- 💰 **Cost Optimization** - Routes simple queries to cheaper models (saves ~50%)
- 📊 **Budget Tracking** - Automatic logging of all requests and costs
- ⚙️ **Configurable** - Customize models, thresholds, and behavior
- 🔌 **Zero Config** - Works out of the box with sensible defaults

---

## Installation

### Quick Install (Recommended)

```bash
git clone https://github.com/yourusername/smart-router-openclaw.git
cd smart-router-openclaw
bash install.sh
```

The installer will:
1. Build the plugin
2. Install to `~/.openclaw/plugins/`
3. Update your OpenClaw config
4. Create the `smart-router` CLI command
5. Check for required API keys

### Manual Install

```bash
# Build
cd smart-router-openclaw
npm install
npm run build

# Install
mkdir -p ~/.openclaw/plugins
cp -r . ~/.openclaw/plugins/smart-router-openclaw

# Configure
cat >> ~/.openclaw/openclaw.json << 'EOF'
{
  "plugins": {
    "entries": {
      "smart-router-openclaw": {
        "enabled": true,
        "path": "~/.openclaw/plugins/smart-router-openclaw",
        "config": {
          "enableBudgetTracking": true,
          "enableLogging": true
        }
      }
    }
  }
}
EOF
```

---

## Usage

Once installed, Smart Router automatically becomes your default model. Every message is classified and routed:

```
You: "ok thanks"
→ Routed to L0 (Gemini Flash) - $0.10/M tokens

You: "Design a microservices architecture"
→ Routed to L2 (Claude Sonnet) - $3.00/M tokens
```

### CLI Commands

```bash
smart-router stats          # Show today's statistics
smart-router stats 7        # Show last 7 days
smart-router test           # Run classification tests
smart-router config         # Show current configuration
```

---

## Routing Logic

| Tier | Model | Cost | Triggers |
|------|-------|------|----------|
| **L0** | Gemini Flash Lite | $0.10/M | Short messages (<20 chars), acknowledgments (ok, thanks, 👍), greetings, status checks |
| **L1** | Kimi K2.5 | $0.60/M | Everything else - general questions, conversation |
| **L2** | Claude Sonnet 4.5 | $3.00/M | Code blocks, complex keywords (design, debug, architect), long messages (>500 chars) |

### Examples

| Message | Tier | Why |
|---------|------|-----|
| "ok" | L0 | Acknowledgment |
| "thanks!" | L0 | Acknowledgment |
| "What's the weather?" | L0 | Simple query |
| "Explain quantum computing" | L1 | General question |
| "Design a microservices architecture" | L2 | Complex task |
| "Debug this memory leak" | L2 | Debugging |
| "```python\ndef fib(n):...```" | L2 | Code block |

---

## Configuration

Add to `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "entries": {
      "smart-router-openclaw": {
        "enabled": true,
        "path": "~/.openclaw/plugins/smart-router-openclaw",
        "config": {
          "defaultTier": "L1",
          "l0Threshold": 20,
          "l2Threshold": 500,
          "enableBudgetTracking": true,
          "enableLogging": true,
          "customL0Model": "google/gemini-2.0-flash-lite",
          "customL1Model": "moonshot/kimi-k2.5",
          "customL2Model": "anthropic/claude-sonnet-4-5"
        }
      }
    }
  }
}
```

### Options

| Option | Default | Description |
|--------|---------|-------------|
| `defaultTier` | `"L1"` | Fallback tier when classification is uncertain |
| `l0Threshold` | `20` | Character threshold for L0 classification |
| `l2Threshold` | `500` | Character threshold for L2 classification |
| `enableBudgetTracking` | `true` | Log all requests to budget file |
| `enableLogging` | `true` | Print routing decisions to console |
| `customL0Model` | `"google/gemini-2.0-flash-lite"` | Custom L0 model |
| `customL1Model` | `"moonshot/kimi-k2.5"` | Custom L1 model |
| `customL2Model` | `"anthropic/claude-sonnet-4-5"` | Custom L2 model |

### Using Custom Models

You can use any OpenClaw-supported model:

```json
{
  "config": {
    "customL0Model": "openai/gpt-4o-mini",
    "customL1Model": "openai/gpt-4o",
    "customL2Model": "anthropic/claude-opus-4"
  }
}
```

---

## Required API Keys

| Provider | Environment Variable | For Tier |
|----------|---------------------|----------|
| Google | `GOOGLE_API_KEY` | L0 |
| Moonshot | `MOONSHOT_API_KEY` | L1 |
| Anthropic | `ANTHROPIC_API_KEY` | L2 |

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
export GOOGLE_API_KEY="your-key"
export MOONSHOT_API_KEY="your-key"
export ANTHROPIC_API_KEY="your-key"
```

---

## Budget Tracking

All requests are automatically logged to:

```
~/.openclaw/data/smart-router-budget.jsonl
```

Each entry includes:
- Timestamp
- Tier used
- Model used
- Token counts
- Cost

View statistics with:

```bash
smart-router stats        # Today
smart-router stats 7      # Last 7 days
smart-router stats 30     # Last 30 days
```

---

## Cost Comparison

| Tier | Model | Input | Output | Best For |
|------|-------|-------|--------|----------|
| L0 | Gemini Flash Lite | $0.10/M | $0.40/M | Simple queries |
| L1 | Kimi K2.5 | $0.60/M | $3.00/M | General queries |
| L2 | Claude Sonnet 4.5 | $3.00/M | $15.00/M | Complex tasks |

### Example Savings

| Message | Tier | Cost | vs L2 Savings |
|---------|------|------|---------------|
| "ok thanks" | L0 | $0.000001 | 97% |
| "What's the weather?" | L0 | $0.000001 | 97% |
| "Explain quantum computing" | L1 | $0.000024 | 80% |
| "Design microservices" | L2 | $0.000229 | 0% |

**Typical usage: 50-70% savings**

---

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Test classification
npm test
```

---

## Publishing to ClawHub

```bash
# Build
npm run build

# Publish (requires ClawHub CLI)
clawhub publish

# Or manually
zip -r smart-router-openclaw.zip . -x "node_modules/*" "src/*" "*.ts" "tsconfig.json"
# Upload to clawhub.com
```

---

## Troubleshooting

### Plugin not loading

1. Check OpenClaw logs: `openclaw logs`
2. Verify plugin path in config
3. Ensure build succeeded: `ls -la dist/`

### API key errors

1. Verify keys are set: `echo $GOOGLE_API_KEY`
2. Restart OpenClaw after setting keys
3. Check provider-specific error messages

### Budget tracking not working

1. Check data directory exists: `ls -la ~/.openclaw/data/`
2. Verify `enableBudgetTracking` is true in config
3. Check file permissions

---

## License

MIT

---

## Contributing

Pull requests welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a PR

---

<p align="center">
  Made with ❤️ for the OpenClaw community
</p>
