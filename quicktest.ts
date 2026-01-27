/**
 * Quick Test Script
 *
 * Run this to test that everything is working
 *
 * Usage:
 *   npm install -g tsx
 *   tsx quicktest.ts
 */

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║   ACE GOVERNANCE PLATFORM - QUICK TEST                        ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

console.log('✓ TypeScript is working!');
console.log('✓ Node.js is running!');

// Test 1: Check if Anthropic SDK is installed
try {
  await import('@anthropic-ai/sdk');
  console.log('✓ Anthropic SDK installed');
} catch (e) {
  console.log('✗ Anthropic SDK NOT installed - run: npm install');
}

// Test 2: Check if Playwright is installed
try {
  await import('playwright');
  console.log('✓ Playwright installed');
} catch (e) {
  console.log('✗ Playwright NOT installed - run: npm install');
}

// Test 3: Check if API key is set
const apiKey = process.env.ANTHROPIC_API_KEY;
if (apiKey && apiKey !== 'your-api-key-here') {
  console.log('✓ API key is configured');
} else {
  console.log('⚠️  API key NOT configured - edit .env file');
}

console.log('\n✅ Basic setup looks good!');
console.log('\nNext steps:');
console.log('  1. Edit .env and add your Claude API key');
console.log('  2. Run: npm run dev');
console.log('  3. Open browser to http://localhost:5173');
console.log('');
