#!/usr/bin/env node
/**
 * Smart Router Dispatcher (Dynamic Configuration)
 * Loads routing criteria from a JSON file for easy user adjustments.
 */

const fs = require('fs');
const path = require('path');

// Default Tiered Models (OpenAI-optimized, batch-friendly)
// Pricing per 1M tokens (input/output): https://developers.openai.com/api/docs/pricing
const TIER_MODELS = {
  L0: 'openai/gpt-5.4-nano',     // $0.20/$1.25 - Ultra-cheap for simple tasks
  L1: 'openai/gpt-5.4',          // $2.50/$15.00 - Standard reasoning
  L2: 'openai/gpt-5.5',          // $5.00/$30.00 - Premium for complex work
  CODEX: 'openai/gpt-5.3-codex'  // $1.75/$14.00 - Specialized for coding
};

// Batch mode configuration (configurable discount)
const BATCH_CONFIG = {
  enabled: true,
  eligible_tiers: ['L0', 'L1', 'L2'], // Only CODEX needs real-time (interactive coding)
  discount_percent: 50,                // Current OpenAI batch discount (adjust as needed)
  max_delay_hours: 24                  // Max acceptable delay for batch processing
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
  
  // 🟣 CODEX: Coding Tasks (highest priority)
  const codingPatterns = [
    /\b(write|create|build|implement|code|script|function|class|debug|refactor)\b.*\b(code|script|function|program|app|system|api)\b/i,
    /```[\w]*\n[\s\S]+```/,  // Code blocks
    /\b(javascript|python|typescript|react|node|npm|git|bash|sql)\b/i,
    /\b(debug|fix.*bug|trace|error.*line|stack trace)\b/i
  ];
  if (codingPatterns.some(p => p.test(text))) {
    return { tier: 'CODEX', reason: 'Coding task detected', confidence: 0.9 };
  }
  
  // 🔴 TIER L2: Complex Reasoning (philosophy, architecture, deep analysis)
  if (L2_REGEX.some(p => p.test(text)) || text.length >= (CRITERIA.L2.min_length || 400)) {
    return { tier: 'L2', reason: 'Complex reasoning or long-form analysis', confidence: 0.85 };
  }
  
  // 🟢 TIER L0: Short or Acknowledgment
  const isExcludedFromL0 = L2_REGEX.some(p => p.test(text)) || text.length >= (CRITERIA.L2.min_length || 400);
  if (!isExcludedFromL0 && (L0_REGEX.some(p => p.test(lowerText)) || (text.length > 0 && text.length <= (CRITERIA.L0.max_length || 15)))) {
    return { tier: 'L0', reason: 'Short command or acknowledgment match', confidence: 0.9 };
  }
  
  // 🟡 TIER L1: General Conversation (Standard)
  return { tier: 'L1', reason: 'General conversation (Worker tier)', confidence: 0.8 };
}

module.exports = { classifyMessage, TIER_MODELS };

// CLI Test Runner
if (require.main === module) {
  const testMessages = [
    "ok", "ping", "design a system", "deep dive into apologetics", 
    "what's the weather like?", "help me write a script"
  ];
  
  console.log('Smart Router - Dynamic Test Result:\n');
  testMessages.forEach(msg => {
    const result = classifyMessage(msg);
    console.log(`"${msg}" → ${result.tier} (${result.reason})`);
  });
}
