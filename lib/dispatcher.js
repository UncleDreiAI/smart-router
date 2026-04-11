#!/usr/bin/env node
/**
 * Smart Router Dispatcher (Dynamic Configuration)
 * Loads routing criteria from a JSON file for easy user adjustments.
 */

const fs = require('fs');
const path = require('path');

// Default Tiered Models (Overridable via openclaw.json)
const TIER_MODELS = {
  L0: 'google/gemini-2.0-flash-lite',
  L1: 'moonshot/kimi-k2.5',
  L2: 'anthropic/claude-sonnet-4-5'
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
  
  // 🔴 TIER L2: Complex Reasoning or Code
  if (L2_REGEX.some(p => p.test(text)) || text.length >= (CRITERIA.L2.min_length || 400)) {
    return { tier: 'L2', reason: 'Complex request, reasoning match, or code detected', confidence: 0.85 };
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
