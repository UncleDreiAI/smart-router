/**
 * Smart Router OpenClaw Plugin
 *
 * An OpenClaw provider plugin that intelligently routes requests to L0/L1/L2 models
 * based on complexity analysis. Saves ~50% on typical API usage.
 *
 * @version 1.0.0
 */
import * as fs from "fs";
import * as path from "path";
// Default tier configuration - users can override via plugin config
const DEFAULT_TIER_CONFIG = {
    L0: {
        model: "google/gemini-2.0-flash-lite",
        provider: "google",
        costPer1M: { input: 0.10, output: 0.40 },
        description: "Fast, cheap for simple queries",
        maxTokens: 8192,
        contextWindow: 1000000
    },
    L1: {
        model: "moonshot/kimi-k2.5",
        provider: "moonshot",
        costPer1M: { input: 0.60, output: 3.00 },
        description: "Balanced capability and cost",
        maxTokens: 8192,
        contextWindow: 256000
    },
    L2: {
        model: "anthropic/claude-sonnet-4-5",
        provider: "anthropic",
        costPer1M: { input: 3.00, output: 15.00 },
        description: "High capability for complex tasks",
        maxTokens: 8192,
        contextWindow: 200000
    }
};
// ============================================================================
// Classification Patterns
// ============================================================================
const L0_PATTERNS = [
    // Acknowledgments
    /^(ok|okay|thanks|thank you|thx|ty|yes|no|cool|nice|👍|🙏|got it|roger|copy|sure|yep|yeah|nah|nope)$/i,
    // Greetings
    /^(hi|hello|hey|hola|sup|yo|greetings|howdy|morning|evening|night)$/i,
    // Status checks
    /^(status|ping|alive\?|you there\?|test|testing|pong)$/i,
    // Simple queries
    /^(weather|temp|temperature|time|date|day|what day|what time)$/i,
    // Farewells
    /^(bye|goodbye|see ya|cya|later|peace|ttyl|gn|good night)$/i
];
const L2_PATTERNS = [
    // Complex actions
    /\b(design|architect|explain why|compare|analyze deeply|debug|troubleshoot|refactor|optimize|implement|evaluate|assess)\b/i,
    // Code indicators
    /```[\s\S]+```/,
    /\b(code|function|class|method|variable|algorithm|data structure)\b/i,
    // Technical complexity
    /\b(complex|difficult|hard|tricky|architecture|algorithm|performance|memory leak|race condition|deadlock|bottleneck|scalability)\b/i,
    // Development tasks
    /\b(create|build|implement|write|develop).+\b(app|application|system|service|api|library|framework|microservice|platform)\b/i,
    // Review/audit tasks
    /\b(review|audit|assess|evaluate).+\b(code|design|architecture|security|performance|implementation)\b/i,
    // DevOps/Infrastructure
    /\b(integrate|deploy|ci\/cd|pipeline|infrastructure|kubernetes|docker|terraform|aws|azure|gcp)\b/i,
    // Database/Storage
    /\b(database|sql|nosql|query|schema|migration|indexing|replication|sharding)\b/i
];
// ============================================================================
// Budget Tracking
// ============================================================================
class BudgetTracker {
    dataDir;
    logFile;
    enabled;
    constructor(enabled = true) {
        this.dataDir = path.resolve(process.env.HOME || "", ".openclaw", "data");
        this.logFile = path.join(this.dataDir, "smart-router-budget.jsonl");
        this.enabled = enabled;
        this.ensureDataDir();
    }
    ensureDataDir() {
        if (!this.enabled)
            return;
        try {
            if (!fs.existsSync(this.dataDir)) {
                fs.mkdirSync(this.dataDir, { recursive: true });
            }
        }
        catch (e) {
            console.warn("[SmartRouter] Could not create data directory:", e);
        }
    }
    log(result, inputTokens, outputTokens, message) {
        if (!this.enabled)
            return;
        try {
            const config = this.getTierConfig(result.tier);
            const inputCost = (inputTokens / 1000000) * config.costPer1M.input;
            const outputCost = (outputTokens / 1000000) * config.costPer1M.output;
            const totalCost = inputCost + outputCost;
            const entry = {
                date: new Date().toISOString().split('T')[0],
                timestamp: Date.now(),
                tier: result.tier,
                model: result.model,
                inputTokens,
                outputTokens,
                cost: totalCost,
                message: message.substring(0, 100) // Truncate for privacy
            };
            fs.appendFileSync(this.logFile, JSON.stringify(entry) + '\n');
        }
        catch (e) {
            // Silently fail - don't break the user experience
        }
    }
    getStats(days = 1) {
        if (!this.enabled || !fs.existsSync(this.logFile)) {
            return { totalCost: 0, byTier: {}, savings: 0 };
        }
        try {
            const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
            const entries = fs.readFileSync(this.logFile, 'utf-8')
                .split('\n')
                .filter(line => line.trim())
                .map(line => JSON.parse(line))
                .filter(entry => entry.timestamp > cutoff);
            const totalCost = entries.reduce((sum, e) => sum + e.cost, 0);
            const byTier = entries.reduce((acc, e) => {
                acc[e.tier] = (acc[e.tier] || 0) + e.cost;
                return acc;
            }, {});
            // Calculate hypothetical cost if all were L2
            const l2CostPerToken = DEFAULT_TIER_CONFIG.L2.costPer1M.input / 1000000;
            const hypotheticalCost = entries.reduce((sum, e) => {
                return sum + (e.inputTokens * l2CostPerToken) + (e.outputTokens * l2CostPerToken * 0.7);
            }, 0);
            return {
                totalCost,
                byTier,
                savings: hypotheticalCost - totalCost
            };
        }
        catch (e) {
            return { totalCost: 0, byTier: {}, savings: 0 };
        }
    }
    getTierConfig(tier) {
        return DEFAULT_TIER_CONFIG[tier] || DEFAULT_TIER_CONFIG.L1;
    }
}
// ============================================================================
// Classifier
// ============================================================================
class SmartClassifier {
    config;
    tierConfig;
    constructor(config = {}) {
        this.config = config;
        this.tierConfig = this.buildTierConfig();
    }
    buildTierConfig() {
        return {
            L0: {
                ...DEFAULT_TIER_CONFIG.L0,
                model: this.config.customL0Model || DEFAULT_TIER_CONFIG.L0.model
            },
            L1: {
                ...DEFAULT_TIER_CONFIG.L1,
                model: this.config.customL1Model || DEFAULT_TIER_CONFIG.L1.model
            },
            L2: {
                ...DEFAULT_TIER_CONFIG.L2,
                model: this.config.customL2Model || DEFAULT_TIER_CONFIG.L2.model
            }
        };
    }
    classify(message) {
        const text = message.toLowerCase().trim();
        const l0Threshold = this.config.l0Threshold || 20;
        const l2Threshold = this.config.l2Threshold || 500;
        // L0: Very short or simple acknowledgments
        if (L0_PATTERNS.some(p => p.test(text)) || text.length < l0Threshold) {
            const cfg = this.tierConfig.L0;
            return {
                tier: "L0",
                model: cfg.model,
                provider: cfg.provider,
                reason: "Short/acknowledgment",
                confidence: 0.95,
                estimatedCost: this.estimateCost(text, cfg)
            };
        }
        // L2: Complex tasks, code, architecture
        if (L2_PATTERNS.some(p => p.test(text)) || text.length > l2Threshold) {
            const cfg = this.tierConfig.L2;
            return {
                tier: "L2",
                model: cfg.model,
                provider: cfg.provider,
                reason: "Complex task/code/architecture",
                confidence: 0.85,
                estimatedCost: this.estimateCost(text, cfg)
            };
        }
        // L1: Everything else
        const cfg = this.tierConfig.L1;
        return {
            tier: "L1",
            model: cfg.model,
            provider: cfg.provider,
            reason: "General query",
            confidence: 0.75,
            estimatedCost: this.estimateCost(text, cfg)
        };
    }
    estimateCost(text, config) {
        const tokens = Math.ceil(text.length / 4);
        return (tokens / 1000000) * config.costPer1M.input;
    }
    getTierConfig(tier) {
        return this.tierConfig[tier] || this.tierConfig.L1;
    }
}
// ============================================================================
// Utilities
// ============================================================================
function estimateTokens(text) {
    return Math.ceil(text.length / 4);
}
function truncate(str, maxLen) {
    return str.length > maxLen ? str.substring(0, maxLen) + "..." : str;
}
// ============================================================================
// Plugin Entry Point
// ============================================================================
export default function register(api) {
    const pluginConfig = api.config || {};
    const classifier = new SmartClassifier(pluginConfig);
    const budget = new BudgetTracker(pluginConfig.enableBudgetTracking !== false);
    const enableLogging = pluginConfig.enableLogging !== false;
    if (enableLogging) {
        console.log("[SmartRouter] Plugin loaded. Routing: L0=" + classifier.getTierConfig("L0").model + ", L1=" + classifier.getTierConfig("L1").model + ", L2=" + classifier.getTierConfig("L2").model);
    }
    api.registerProvider({
        id: "smart-router",
        label: "Smart Router (L0/L1/L2)",
        docsPath: "/providers/smart-router",
        auth: [],
        resolveDynamicModel: (ctx) => {
            const messages = ctx.messages || [];
            const lastMessage = messages[messages.length - 1]?.content || "";
            const result = classifier.classify(lastMessage);
            const config = classifier.getTierConfig(result.tier);
            return {
                id: result.model,
                name: `Smart Router (${result.tier})`,
                provider: result.provider,
                api: "openai-completions",
                reasoning: result.tier === "L2",
                input: ["text", "image"],
                cost: {
                    input: config.costPer1M.input,
                    output: config.costPer1M.output,
                    cacheRead: 0,
                    cacheWrite: 0
                },
                contextWindow: config.contextWindow,
                maxTokens: config.maxTokens,
                _routing: result,
                _classifier: classifier,
                _budget: budget
            };
        },
        wrapStreamFn: (ctx) => {
            const innerStreamFn = ctx.streamFn;
            if (!innerStreamFn)
                return undefined;
            return async (params) => {
                const messages = params.messages || [];
                const lastMessage = messages[messages.length - 1]?.content || "";
                const result = classifier.classify(lastMessage);
                const inputTokens = estimateTokens(lastMessage);
                const outputTokens = Math.floor(inputTokens * 0.7); // Estimate
                const modifiedParams = {
                    ...params,
                    model: result.model,
                    headers: {
                        ...params.headers,
                        "X-SmartRouter-Tier": result.tier,
                        "X-SmartRouter-Reason": result.reason,
                        "X-SmartRouter-Confidence": String(result.confidence)
                    }
                };
                // Log to budget tracker
                budget.log(result, inputTokens, outputTokens, lastMessage);
                if (enableLogging) {
                    console.log(`[SmartRouter] ${result.tier} → ${truncate(result.model, 40)} (${result.reason})`);
                }
                return innerStreamFn(modifiedParams);
            };
        },
        catalog: {
            order: "late",
            run: async () => {
                return {
                    provider: {
                        baseUrl: "",
                        apiKey: "",
                        api: "openai-completions",
                        models: [
                            {
                                id: "smart-router-auto",
                                name: "Smart Router (Auto L0/L1/L2)",
                                description: "Automatically routes to L0/L1/L2 based on query complexity. Saves ~50% on typical usage.",
                                reasoning: true,
                                input: ["text", "image"],
                                cost: { input: 0.60, output: 3.00, cacheRead: 0, cacheWrite: 0 },
                                contextWindow: 256000,
                                maxTokens: 8192
                            }
                        ]
                    }
                };
            }
        },
        // Expose stats function for CLI
        getStats: (days = 1) => budget.getStats(days)
    });
}
