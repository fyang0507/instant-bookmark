import dotenv from 'dotenv';
import path from 'path';

// Load .dev.vars specifically for Vitest tests
// Assumes .dev.vars is in the project root (process.cwd())
dotenv.config({ path: path.resolve(process.cwd(), '.dev.vars') });

console.log('[Vitest Setup] Loaded .dev.vars for testing environment.');
if (process.env.BROWSERLESS_TOKEN) {
  console.log('[Vitest Setup] BROWSERLESS_TOKEN is available.');
} else {
  console.warn('[Vitest Setup] Warning: BROWSERLESS_TOKEN is NOT available after loading .dev.vars.');
} 