#!/bin/bash
# Smart Router OpenClaw Plugin - Installation Script
# Version: 1.0.0

set -e

PLUGIN_NAME="smart-router-openclaw"
PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPENCLAW_DIR="${HOME}/.openclaw"
PLUGINS_DIR="${OPENCLAW_DIR}/plugins"
CONFIG_FILE="${OPENCLAW_DIR}/openclaw.json"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo ""
echo -e "${BOLD}🚦 Smart Router for OpenClaw${NC}"
echo -e "${BLUE}   Intelligent L0/L1/L2 Model Routing${NC}"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""

# Check if we're in the right directory
if [ ! -f "${PLUGIN_DIR}/package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found${NC}"
    echo "   Please run this script from the plugin directory"
    exit 1
fi

# Check for Node.js
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found. Please install Node.js 22+${NC}"
    exit 1
fi

# Build the plugin
echo -e "${BLUE}📦 Building plugin...${NC}"
cd "${PLUGIN_DIR}"
npm install --silent
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# Create plugins directory
echo ""
echo -e "${BLUE}📁 Installing plugin...${NC}"
mkdir -p "${PLUGINS_DIR}"

# Copy plugin to OpenClaw plugins
INSTALL_DIR="${PLUGINS_DIR}/${PLUGIN_NAME}"
if [ -d "${INSTALL_DIR}" ]; then
    echo "🔄 Updating existing installation..."
    rm -rf "${INSTALL_DIR}"
fi

cp -r "${PLUGIN_DIR}" "${INSTALL_DIR}"
echo -e "${GREEN}✅ Plugin installed to:${NC}"
echo "   ${INSTALL_DIR}"

# Backup existing config
echo ""
if [ -f "${CONFIG_FILE}" ]; then
    BACKUP_FILE="${CONFIG_FILE}.backup.$(date +%Y%m%d%H%M%S)"
    cp "${CONFIG_FILE}" "${BACKUP_FILE}"
    echo -e "${YELLOW}💾 Backed up config to:${NC}"
    echo "   ${BACKUP_FILE}"
fi

# Update or create config
echo ""
echo -e "${BLUE}⚙️  Configuring OpenClaw...${NC}"

# Function to add plugin to config
add_plugin_to_config() {
    local config_file="$1"
    
    if command -v jq &> /dev/null; then
        # Use jq if available
        if [ -f "$config_file" ]; then
            # Update existing config
            jq '.plugins.entries["smart-router-openclaw"] = {
                "enabled": true,
                "path": "~/.openclaw/plugins/smart-router-openclaw",
                "config": {
                    "enableBudgetTracking": true,
                    "enableLogging": true
                }
            }' "$config_file" > "${config_file}.tmp" && mv "${config_file}.tmp" "$config_file"
        else
            # Create new config
            mkdir -p "$(dirname "$config_file")"
            cat > "$config_file" << 'EOF'
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
        fi
    else
        # Fallback: manual instructions
        echo -e "${YELLOW}⚠️  jq not found. Please manually update your config:${NC}"
        echo ""
        echo "Add this to ${CONFIG_FILE}:"
        echo '"
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
"'
        return 1
    fi
    return 0
}

if add_plugin_to_config "$CONFIG_FILE"; then
    echo -e "${GREEN}✅ Configuration updated${NC}"
else
    echo -e "${YELLOW}⚠️  Please manually update your configuration${NC}"
fi

# Check for required API keys
echo ""
echo -e "${BLUE}🔑 Checking API keys...${NC}"

MISSING_KEYS=()

if [ -z "${GOOGLE_API_KEY}" ] && [ -z "${GEMINI_API_KEY}" ]; then
    MISSING_KEYS+=("GOOGLE_API_KEY or GEMINI_API_KEY (for L0/Gemini)")
fi

if [ -z "${MOONSHOT_API_KEY}" ] && [ -z "${KIMI_API_KEY}" ]; then
    MISSING_KEYS+=("MOONSHOT_API_KEY or KIMI_API_KEY (for L1/Kimi)")
fi

if [ -z "${ANTHROPIC_API_KEY}" ]; then
    MISSING_KEYS+=("ANTHROPIC_API_KEY (for L2/Claude)")
fi

if [ ${#MISSING_KEYS[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ All required API keys are set${NC}"
else
    echo -e "${YELLOW}⚠️  Missing API keys:${NC}"
    for key in "${MISSING_KEYS[@]}"; do
        echo "   • ${key}"
    done
    echo ""
    echo -e "${BLUE}Set them in your ~/.bashrc or ~/.zshrc:${NC}"
    echo '   export GOOGLE_API_KEY="your-key"'
    echo '   export MOONSHOT_API_KEY="your-key"'
    echo '   export ANTHROPIC_API_KEY="your-key"'
fi

# Create CLI wrapper
echo ""
echo -e "${BLUE}🛠️  Creating CLI wrapper...${NC}"
WRAPPER_FILE="${HOME}/.local/bin/smart-router"

mkdir -p "$(dirname "$WRAPPER_FILE")"

cat > "$WRAPPER_FILE" << 'WRAPPER_EOF'
#!/bin/bash
# Smart Router CLI

PLUGIN_DIR="${HOME}/.openclaw/plugins/smart-router-openclaw"
DATA_FILE="${HOME}/.openclaw/data/smart-router-budget.jsonl"

show_help() {
    echo "🚦 Smart Router CLI"
    echo ""
    echo "Usage: smart-router [command]"
    echo ""
    echo "Commands:"
    echo "  stats [days]     Show spending statistics (default: 1 day)"
    echo "  test             Run classification tests"
    echo "  config           Show current configuration"
    echo "  help             Show this help"
    echo ""
    echo "Examples:"
    echo "  smart-router stats        # Today's stats"
    echo "  smart-router stats 7      # Last 7 days"
}

show_stats() {
    local days="${1:-1}"
    
    if [ ! -f "$DATA_FILE" ]; then
        echo "📊 No data yet. Start chatting to generate statistics!"
        return
    fi
    
    echo "📊 Smart Router Statistics (last ${days} day(s))"
    echo "════════════════════════════════════════════════════════════"
    echo ""
    
    # Parse and display stats using node
    node -e "
const fs = require('fs');
const path = '${DATA_FILE}';
const days = ${days};

if (!fs.existsSync(path)) {
    console.log('No data file found');
    process.exit(0);
}

const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
const entries = fs.readFileSync(path, 'utf-8')
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line))
    .filter(entry => entry.timestamp > cutoff);

if (entries.length === 0) {
    console.log('No entries found for this period');
    process.exit(0);
}

const totalCost = entries.reduce((sum, e) => sum + e.cost, 0);
const byTier = entries.reduce((acc, e) => {
    acc[e.tier] = (acc[e.tier] || 0) + 1;
    return acc;
}, {});

const totalTokens = entries.reduce((sum, e) => sum + e.inputTokens + e.outputTokens, 0);

console.log(\`💰 Total Cost:       \$\${totalCost.toFixed(4)}\`);
console.log(\`📝 Total Requests:   \${entries.length}\`);
console.log(\`🔤 Total Tokens:     \${totalTokens.toLocaleString()}\`);
console.log('');
console.log('📈 By Tier:');
Object.entries(byTier).forEach(([tier, count]) => {
    const pct = ((count / entries.length) * 100).toFixed(1);
    console.log(\`   \${tier}: \${count} requests (\${pct}%)\`);
});
"
}

show_config() {
    echo "⚙️  Smart Router Configuration"
    echo "════════════════════════════════════════════════════════════"
    echo ""
    echo "Default Models:"
    echo "  L0: google/gemini-2.0-flash-lite  (\$0.10/M tokens)"
    echo "  L1: moonshot/kimi-k2.5            (\$0.60/M tokens)"
    echo "  L2: anthropic/claude-sonnet-4-5   (\$3.00/M tokens)"
    echo ""
    echo "Config file: ${HOME}/.openclaw/openclaw.json"
    echo "Data file:   ${DATA_FILE}"
}

run_tests() {
    echo "🧪 Running classification tests..."
    echo ""
    
    node -e "
const tests = [
    { msg: 'ok', tier: 'L0' },
    { msg: 'thanks!', tier: 'L0' },
    { msg: 'Design a microservices architecture', tier: 'L2' },
    { msg: 'What is the weather?', tier: 'L0' },
    { msg: 'Explain quantum computing', tier: 'L1' },
    { msg: 'Debug this memory leak', tier: 'L2' }
];

// Simple pattern matching (same as plugin)
const L0_PATTERNS = [
    /^(ok|okay|thanks|thank you|thx|yes|no|cool|nice|👍|🙏|got it|sure|yep|yeah|nah)\$/i,
    /^(hi|hello|hey|hola|sup|yo|greetings)\$/i,
    /^(status|ping|alive|test)\$/i,
    /^(weather|temp|time|date|day)\$/i
];

const L2_PATTERNS = [
    /\\b(design|architect|debug|troubleshoot|refactor|optimize|implement|analyze)\\b/i,
    /\\b(complex|architecture|algorithm|performance|memory leak)\\b/i
];

function classify(msg) {
    const text = msg.toLowerCase().trim();
    
    if (L0_PATTERNS.some(p => p.test(text)) || text.length < 20) {
        return 'L0';
    }
    if (L2_PATTERNS.some(p => p.test(text)) || text.length > 500) {
        return 'L2';
    }
    return 'L1';
}

let passed = 0;
tests.forEach(t => {
    const result = classify(t.msg);
    const ok = result === t.tier;
    if (ok) passed++;
    console.log((ok ? '✅' : '❌') + ' \"' + t.msg.substring(0, 40) + '\" → ' + result + ' (expected ' + t.tier + ')');
});

console.log('');
console.log('Results: ' + passed + '/' + tests.length + ' passed');
"
}

case "${1:-help}" in
    stats|s)
        show_stats "${2:-1}"
        ;;
    test|t)
        run_tests
        ;;
    config|c)
        show_config
        ;;
    help|h|--help|-h)
        show_help
        ;;
    *)
        echo "Unknown command: $1"
        echo "Run 'smart-router help' for usage"
        exit 1
        ;;
esac
WRAPPER_EOF

chmod +x "$WRAPPER_FILE"

# Add to PATH if not already there
if [[ ":$PATH:" != *":${HOME}/.local/bin:"* ]]; then
    echo 'export PATH="${HOME}/.local/bin:${PATH}"' >> "${HOME}/.bashrc"
    echo -e "${YELLOW}⚠️  Added ${HOME}/.local/bin to PATH in ~/.bashrc${NC}"
    echo "   Run 'source ~/.bashrc' or restart your terminal"
fi

echo -e "${GREEN}✅ CLI wrapper installed:${NC}"
echo "   ${WRAPPER_FILE}"

# Summary
echo ""
echo "════════════════════════════════════════════════════════════"
echo -e "${GREEN}${BOLD}🎉 Installation Complete!${NC}"
echo ""
echo -e "${BOLD}Next Steps:${NC}"
echo "  1. ${BOLD}Restart your OpenClaw gateway${NC}"
echo "  2. Smart Router is now your default model"
echo "  3. All messages will be automatically routed"
echo ""
echo -e "${BOLD}CLI Usage:${NC}"
echo "  smart-router stats        # View today's statistics"
echo "  smart-router stats 7      # View last 7 days"
echo "  smart-router test         # Run classification tests"
echo "  smart-router config       # Show configuration"
echo ""
echo -e "${BOLD}Routing Tiers:${NC}"
echo -e "  ${GREEN}L0${NC} (Gemini Flash)  - Simple queries, \$0.10/M tokens"
echo -e "  ${YELLOW}L1${NC} (Kimi K2.5)     - General queries, \$0.60/M tokens"
echo -e "  ${RED}L2${NC} (Claude Sonnet) - Complex tasks, \$3.00/M tokens"
echo ""
echo -e "${BOLD}Expected Savings:${NC} ~50% on typical usage"
echo "════════════════════════════════════════════════════════════"
echo ""
