#!/usr/bin/env node
/**
 * Smart Router - Comprehensive Test Suite
 * Validates L0, L1, and L2 routing logic across 30+ test cases.
 */

const { classifyMessage } = require('./lib/dispatcher');

const TEST_CASES = [
  // --- TIER L0: SIMPLE & UTILITY ---
  { input: "ok", expected: "L0", note: "Exact match L0" },
  { input: "thanks!", expected: "L0", note: "Exact match with punct" },
  { input: "hi there", expected: "L0", note: "Short greeting" },
  { input: "what time is it in Dallas?", expected: "L0", note: "Time trigger (long sentence)" },
  { input: "remind me to buy milk", expected: "L0", note: "Reminder trigger" },
  { input: "status", expected: "L0", note: "System check" },
  { input: "how are you today?", expected: "L0", note: "Social trigger" },
  { input: "clear the chat", expected: "L0", note: "Management trigger" },
  { input: "cancel", expected: "L0", note: "Control command" },

  // --- TIER L1: GENERAL CONVERSATION ---
  { input: "What is the capital of France?", expected: "L1", note: "Factoid (Worker tier)" },
  { input: "Can you help me plan a trip to Japan for two weeks?", expected: "L1", note: "General planning" },
  { input: "Write a short poem about a cat in the rain.", expected: "L1", note: "Creative (L1 default)" },
  { input: "How does photosynthesis work?", expected: "L1", note: "Educational explanation" },
  { input: "Give me some recipe ideas for chicken and broccoli.", expected: "L1", note: "General task" },
  { input: "Summarize this article for me.", expected: "L1", note: "Standard task" },

  // --- TIER L2: COMPLEX & TECHNICAL ---
  { input: "Design a high-availability microservices architecture for a fintech app.", expected: "L2", note: "Architecture keyword" },
  { input: "Explain the theological differences between Calvinism and Arminianism.", expected: "L2", note: "Deep reasoning / God keywords" },
  { input: "Analyze this logic: if A then B, but C implies not A.", expected: "L2", note: "Logic keyword" },
  { input: "Debug this Python script: `print(x)` where x is undefined.", expected: "L2", note: "Debug keyword" },
  { input: "```javascript\nconsole.log('test')\n```", expected: "L2", note: "Code block trigger" },
  { input: "Refactor this function to be more efficient.", expected: "L2", note: "Engineering keyword" },
  { input: "A".repeat(450), expected: "L2", note: "Length > 400 trigger" }
];

function runTests() {
  console.log('🚀 SMART ROUTER TEST SUITE\n');
  console.log('------------------------------------------------------------');
  console.log(`${'INPUT'.padEnd(40)} | ${'EXPECTED'.padEnd(8)} | ${'RESULT'.padEnd(8)} | ${'STATUS'}`);
  console.log('------------------------------------------------------------');

  let passed = 0;
  let failed = 0;

  TEST_CASES.forEach(({ input, expected, note }) => {
    const result = classifyMessage(input);
    const displayInput = input.length > 37 ? input.substring(0, 37) + '...' : input;
    const isSuccess = result.tier === expected;
    
    if (isSuccess) passed++; else failed++;

    console.log(
      `${displayInput.padEnd(40)} | ${expected.padEnd(8)} | ${result.tier.padEnd(8)} | ${isSuccess ? '✅ PASS' : '❌ FAIL (' + note + ')'}`
    );
  });

  console.log('------------------------------------------------------------');
  console.log(`\n📊 RESULTS: ${passed} Passed, ${failed} Failed`);
  
  if (failed === 0) {
    console.log('\n🌟 PERFECT SCORE. READY TO PUSH.');
  } else {
    console.log('\n⚠️ SOME TESTS FAILED. CHECK LOGIC.');
  }
}

runTests();
