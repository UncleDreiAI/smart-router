#!/usr/bin/env node
/**
 * Smart Router Dispatcher (Dynamic Configuration) — v2.0 Local-First
 * Loads routing criteria from a JSON file for easy user adjustments.
 *
 * Tiers:
 *   LOCAL   ollama/phi4-mini     - local judge for docs/email/routine
 *   L0      ollama/gemma3:4b     - local creative/routine worker
 *   L1      openai/gpt-5.4-nano  - conversational (cloud, cheap)
 *   L2_DEV  openai/gpt-5.3-codex - coding tasks (cloud; real-time)
 *   L2_GEN  openai/gpt-5.5       - complex reasoning (cloud; throttled)
 */

const fs = require('fs');
const path = require('path');

// Default Tiered Models (Local-First)
const TIER_MODELS = {
  LOCAL: 'ollama/phi4-mini',       // Primary local judge/reasoning
  L0: 'ollama/gemma3:4b',          // Local worker for routine/creative
  L1: 'openai/gpt-5.4-nano',       // Standard conversational
  L2_DEV: 'openai/gpt-5.3-codex',  // Development / Coding
  L2_GEN: 'openai/gpt-5.5'         // Premium Reasoning / Creative
};

// Paths for persistent criteria
const CRITERIA_PATH = path.resolve(__dirname, 'criteria.json');

// Load triggers from JSON with safe fallback
let CRITERIA = {
  L2_DEV: { patterns: [] },
  L2_GEN: { patterns: [], min_length: 500 },
  LOCAL: { patterns: [] },
  L0: { patterns: [], max_length: 20 }
};

try {
  CRITERIA = JSON.parse(fs.readFileSync(CRITERIA_PATH, 'utf8'));
} catch (err) {
  console.warn('Smart Router: Warning - Failed to load criteria.json, using defaults.');
}

// Pre-compile Regex patterns for performance
const L2_DEV_REGEX = (CRITERIA.L2_DEV?.patterns || []).map(p => new RegExp(p, 'i'));
const L2_GEN_REGEX = (CRITERIA.L2_GEN?.patterns || []).map(p => new RegExp(p, 'i'));
const LOCAL_REGEX = (CRITERIA.LOCAL?.patterns || []).map(p => new RegExp(p, 'i'));
const L0_REGEX = (CRITERIA.L0?.patterns || []).map(p => new RegExp(p, 'i'));

function classifyMessage(message) {
  const text = message.trim();
  const lowerText = text.toLowerCase();
  const l0Threshold = CRITERIA.L0?.max_length || 20;
  const l2Threshold = CRITERIA.L2_GEN?.min_length || 500;

  // 1. L2_DEV: Coding Tasks (highest priority — always escalate)
  if (L2_DEV_REGEX.some(p => p.test(text))) {
    return { tier: 'L2_DEV', reason: 'Coding task detected', confidence: 0.9 };
  }

  // 2. L2_GEN: Complex Reasoning (escalate to cloud)
  if (L2_GEN_REGEX.some(p => p.test(text)) || text.length >= l2Threshold) {
    return { tier: 'L2_GEN', reason: 'Complex reasoning detected', confidence: 0.85 };
  }

  // 3. LOCAL: Routine/docs/email (stay local)
  if (LOCAL_REGEX.some(p => p.test(lowerText))) {
    return { tier: 'LOCAL', reason: 'Routine task — local judge', confidence: 0.85 };
  }

  // 4. L0: Short or Acknowledgment (stay local)
  const isExcludedFromL0 = L2_GEN_REGEX.some(p => p.test(text)) || text.length >= l2Threshold;
  if (!isExcludedFromL0 && (L0_REGEX.some(p => p.test(lowerText)) || (text.length > 0 && text.length <= l0Threshold))) {
    return { tier: 'L0', reason: 'Short command or acknowledgment', confidence: 0.9 };
  }

  // 5. L1: General Conversation (default cloud tier)
  return { tier: 'L1', reason: 'General conversation', confidence: 0.7 };
}

module.exports = { classifyMessage, TIER_MODELS };

// CLI Test Runner
if (require.main === module) {
  const testMessages = [
    "ok", "ping", "design a system", "summarize my email",
    "what's the weather like?", "help me write a script", "deep dive into apologetics"
  ];

  console.log('Smart Router v2.0 - Local-First Test Result:\n');
  testMessages.forEach(msg => {
    const result = classifyMessage(msg);
    console.log(`"${msg}" → ${result.tier} (${result.reason})`);
  });
}
