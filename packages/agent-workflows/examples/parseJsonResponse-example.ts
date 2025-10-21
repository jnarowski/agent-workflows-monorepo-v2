#!/usr/bin/env bun

/**
 * Example: Parsing JSON from CLI responses
 *
 * This example demonstrates how to use parseJsonResponse() to extract
 * valid JSON from mixed text/JSON responses.
 */

import { parseJsonResponse, parseJsonResponseStrict } from '../src';
import type { CliResponse } from '../src';

console.log('🔍 Example: Parsing JSON from CLI Responses\n');

// Example 1: Response with data field (already parsed)
console.log('1️⃣  Response with data field:');
const response1: CliResponse<{ success: boolean }> = {
  status: 'success',
  data: { success: true },
};
const parsed1 = parseJsonResponse(response1);
console.log('   Input: response.data =', response1.data);
console.log('   Output:', parsed1);
console.log('');

// Example 2: Response with JSON in markdown code block
console.log('2️⃣  Response with JSON in markdown code block:');
const response2: CliResponse = {
  status: 'success',
  output: 'Here is the analysis:\n```json\n{"success": true, "count": 42}\n```\nComplete!',
};
const parsed2 = parseJsonResponse(response2);
console.log('   Input: response.output =');
console.log('   ', response2.output?.split('\n').join('\n    '));
console.log('   Output:', parsed2);
console.log('');

// Example 3: Response with mixed text and JSON
console.log('3️⃣  Response with mixed text and JSON:');
const response3: CliResponse = {
  status: 'success',
  output: 'Analysis complete.\n\n{"success": true, "items": [1, 2, 3]}\n\nDone!',
};
const parsed3 = parseJsonResponse(response3);
console.log('   Input: response.output =');
console.log('   ', response3.output?.split('\n').join('\n    '));
console.log('   Output:', parsed3);
console.log('');

// Example 4: Response with pure JSON
console.log('4️⃣  Response with pure JSON:');
const response4: CliResponse = {
  status: 'success',
  output: '{"message": "Hello", "code": 200}',
};
const parsed4 = parseJsonResponse(response4);
console.log('   Input: response.output =', response4.output);
console.log('   Output:', parsed4);
console.log('');

// Example 5: Response with no valid JSON (returns null)
console.log('5️⃣  Response with no valid JSON:');
const response5: CliResponse = {
  status: 'success',
  output: 'This is just plain text with no JSON.',
};
const parsed5 = parseJsonResponse(response5);
console.log('   Input: response.output =', response5.output);
console.log('   Output:', parsed5);
console.log('');

// Example 6: Using parseJsonResponseStrict (throws on no JSON)
console.log('6️⃣  Using parseJsonResponseStrict (throws on no JSON):');
const response6: CliResponse = {
  status: 'success',
  output: 'No JSON here',
};
try {
  parseJsonResponseStrict(response6);
} catch (error) {
  console.log('   Caught error:', error instanceof Error ? error.message : error);
}
console.log('');

// Example 7: Type-safe parsing with TypeScript
console.log('7️⃣  Type-safe parsing:');
interface CheckResult {
  success: boolean;
  validation_command: string;
  issues: {
    errors: number;
    warnings: number;
    info: number;
  };
}

const response7: CliResponse = {
  status: 'success',
  output: '```json\n{"success": true, "validation_command": "pnpm check", "issues": {"errors": 0, "warnings": 2, "info": 1}}\n```',
};
const parsed7 = parseJsonResponse<CheckResult>(response7);
console.log('   Input: CLI response with CheckResult JSON');
console.log('   Output:', JSON.stringify(parsed7, null, 2));

// TypeScript knows the type!
if (parsed7) {
  console.log('   Errors:', parsed7.issues.errors);
  console.log('   Warnings:', parsed7.issues.warnings);
}
