#!/usr/bin/env node
/**
 * Smart Router Dispatcher (Dynamic Configuration)
 * Loads routing criteria from a JSON file for easy user adjustments.
 */

const fs = require('fs');
const path = require('path');

// Models for routing
const TIER_MODELS = {
  LOCAL: 'ollama/phi4-mini',       // Primary local judge/reasoning
  L0: 'ollama/gemma3:4b',          // Local worker for routine/creative
  L1: 'openai/gpt-5.4-nano',       // Standard conversational (replaced L1 with Nano)
  L2_DEV: 'openai/gpt-5.3-codex',  // Development / Coding
  L2_GEN: 'openai/gpt-5.5'         // Premium Reasoning / Creative
};

// Batch mode configuration (configurable discount)
const BATCH_CONFIG = {
  enabled: true,
  eligible_tiers: ['L0', 'L1', 'L2_DEV', 'L2_GEN'], 
  discount_percent: 50,
  max_delay_hours: 24
};

// Paths for persistent criteria
const CRITERIA_PATH = path.resolve(__dirname, 'criteria.json');

// Load triggers from JSON with safe fallback
let CRITERIA = { L0: { patterns: [], max_length: 15 }, L2: { patterns: [], min_length: 400 } };
try {
  CRITERIA = JSON.parse(fs.readFileSync(CRITERIA_PATH, 'utf8'));
} catch (err) {
  console.warn('Smart Router: Warning - Failed to load criteria.json, using defaults.');
}

// Pre-compile Regex patterns for performance
const L0_REGEX = CRITERIA.L0.patterns.map(p => new RegExp(p, 'i'));
const L2_REGEX = CRITERIA.L2.patterns.map(p => new RegExp(p, 'i'));

function classifyMessage(message) {
  const text = message.trim();
  const lowerText = text.toLowerCase();
  
  // 1. CODEX (Hard Trigger)
  const codingPatterns = [
    /\b(write|create|build|implement|code|script|function|class|debug|refactor)\b.*\b(code|script|function|program|app|system|api)\b/i,
    /```[\w]*\n[\s\S]+```/,
    /\b(javascript|python|typescript|react|node|npm|git|bash|sql)\b/i,
    /\b(debug|fix.*bug|trace|error.*line|stack trace)\b/i
  ];
  if (codingPatterns.some(p => p.test(text))) {
    return { tier: 'L2_DEV', reason: 'Coding task detected', confidence: 0.9 };
  }
  
  // 2. COMPLEX REASONING (Hard Trigger)
  if (L2_REGEX.some(p => p.test(text)) || text.length >= (CRITERIA.L2.min_length || 400)) {
    return { tier: 'L2_GEN', reason: 'Complex reasoning detected', confidence: 0.9 };
  }
  
  // 3. LOCAL FIRST (Default for everything else)
  return { tier: 'LOCAL', reason: 'Routing to Local Judge for initial pass', confidence: 0.7 };
}

module.exports = { classifyMessage, TIER_MODELS };

// CLI Test Runner
if (require.main === module) {
  const testMessages = [
    "ok", "ping", "design a system", "summarize my email", 
    "what's the weather like?", "help me write a script"
  ];
  
  console.log('Smart Router - Dynamic Test Result:\n');
  testMessages.forEach(msg => {
    const result = classifyMessage(msg);
    console.log(`"${msg}" → ${result.tier} (${result.reason})`);
  });
}
