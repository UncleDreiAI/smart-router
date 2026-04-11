#!/usr/bin/env node
/**
 * Smart Router - Secured Main Entry Point
 * Routes incoming messages to L0/L1/L2 based on complexity analysis
 * Security: Input validation, path safety, sanitized logging
 */

const path = require('path');

// SECURITY: Use paths within the skill directory for portability
const DISPATCHER_PATH = path.resolve(__dirname, 'lib', 'dispatcher.js');
const BUDGET_PATH = path.resolve(__dirname, 'lib', 'budget.js');
const TRACKER_PATH = path.resolve(__dirname, 'lib', 'budget-tracker.js');

// SECURITY: Input validation limits
const MAX_MESSAGE_LENGTH = 4000;  // Prevent memory exhaustion
const ALLOWED_TIERS = ['L0', 'L1', 'L2'];

// Load dispatcher and budget logic with error handling
let classifyMessage, TIER_MODELS, UsageTracker, DailyBudgetTracker;
try {
  const dispatcher = require(DISPATCHER_PATH);
  classifyMessage = dispatcher.classifyMessage;
  TIER_MODELS = dispatcher.TIER_MODELS;
  
  const budget = require(BUDGET_PATH);
  UsageTracker = budget.UsageTracker;
  
  const trackerModule = require(TRACKER_PATH);
  DailyBudgetTracker = trackerModule.DailyBudgetTracker;
} catch (err) {
  console.error(JSON.stringify({ error: 'Router initialization failed', safe: true, tier: 'L1' }));
  process.exit(1);
}

// Global usage trackers (per process)
const tracker = new UsageTracker();
const budgetTracker = new DailyBudgetTracker();

// SECURITY: Sanitize message input
function sanitizeInput(args) {
  if (!args || args.length === 0) return null;
  
  // Join arguments and trim
  let message = args.join(' ').trim();
  
  // Length limit
  if (message.length > MAX_MESSAGE_LENGTH) {
    message = message.substring(0, MAX_MESSAGE_LENGTH);
  }
  
  // Remove null bytes and control chars (except newlines/tabs)
  message = message.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '');
  
  return message;
}

// SECURITY: Validate tier result
function validateTier(result) {
  if (!result || !ALLOWED_TIERS.includes(result.tier)) {
    // Fallback to safe default
    return {
      tier: 'L1',
      model: TIER_MODELS?.L1 || 'moonshot/kimi-k2.5',
      confidence: 0.5,
      reason: 'Validation fallback',
      safe: true
    };
  }
  return result;
}

// Main entry point
async function main() {
  const args = process.argv.slice(2);
  
  // Test mode
  if (args.length === 0 || args[0] === '--test') {
    console.log('Smart Router - Test Mode');
    console.log('Usage: smart-router "your message here"');
    console.log('');
    
    const testMessages = [
      "ok",
      "thanks",
      "status",
      "explain why this code doesn't work",
      "design a routing system",
      "what's the weather?",
      "help me write a script"
    ];
    
    testMessages.forEach(msg => {
      const result = classifyMessage(msg);
      console.log(`"${msg}"`);
      console.log(`  → Tier: ${result.tier} (${(result.confidence * 100).toFixed(0)}%)`);
      console.log(`  → Model: ${TIER_MODELS[result.tier]}`);
      console.log(`  → Reason: ${result.reason}\n`);
    });
    return;
  }
  
  // SECURITY: Sanitize input
  const message = sanitizeInput(args);
  if (!message) {
    console.error(JSON.stringify({ error: 'No message provided', safe: true, tier: 'L1' }));
    process.exit(1);
  }
  
  // Classify
  let result;
  try {
    result = classifyMessage(message);
    result = validateTier(result);
  } catch (err) {
    console.error(JSON.stringify({ error: 'Classification failed', safe: true, tier: 'L1' }));
    process.exit(1);
  }
  
  // BUDGET PROTECTION: Check if L2 is allowed
  if (result.tier === 'L2') {
    const budgetCheck = tracker.checkL2Allowed();
    if (!budgetCheck.allowed) {
      // Downgrade to L1 if budget exceeded
      result = {
        tier: 'L1',
        model: TIER_MODELS.L1,
        confidence: 0.7,
        reason: `Downgraded from L2: ${budgetCheck.reason}`,
        budgetLimited: true
      };
    }
  }
  
  // Record this request
  tracker.record(result.tier);
  
  // Get budget status for L2
  const budgetStatus = tracker.checkL2Allowed();
  
  // LOG TO DAILY BUDGET (for reporting)
  // Estimate tokens: 1 token ≈ 4 chars for English text
  const estimatedInputTokens = Math.ceil(message.length / 4);
  const estimatedOutputTokens = Math.ceil(estimatedInputTokens * 1.5); // Estimate response size
  budgetTracker.logRequest(result.tier, result.model, estimatedInputTokens, estimatedOutputTokens);
  
  // SECURITY: Sanitized output (no full message content logged)
  const output = {
    tier: result.tier,
    model: result.model,
    confidence: result.confidence,
    reason: result.reason,
    // SECURITY: Only log message length, not content
    messageLength: message.length,
    // SECURITY: First 20 chars only, with escaping
    messagePreview: message.substring(0, 20).replace(/[\x00-\x1F]/g, '?'),
    // Budget info
    budget: {
      l2Percentage: parseFloat(budgetStatus.l2Percentage),
      l2Allowed: budgetStatus.allowed,
      downgraded: result.budgetLimited || false
    }
  };
  
  console.log(JSON.stringify(output));
}

main().catch(err => {
  // SECURITY: Don't leak stack traces
  console.error(JSON.stringify({ error: 'Router error', safe: true, tier: 'L1' }));
  process.exit(1);
});
