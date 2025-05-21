import { describe, it, expect, beforeAll } from 'vitest';
import { generateContentForUrl } from '../browserless-service';

describe('Browserless Service - generateContentForUrl', () => {
  beforeAll(() => {
    // This is a good place to check if the environment variable is set,
    // though Vitest/Wrangler should handle loading .dev.vars for local tests.
    if (!process.env.BROWSERLESS_TOKEN) {
      console.warn('[browserless-service.test] Warning: BROWSERLESS_TOKEN is not set. Tests might fail if the API requires it.');
      // Depending on strictness, you could throw an error here:
      // throw new Error('BROWSERLESS_TOKEN is not set in the environment. Tests cannot run.');
    }
  });

  it('should fetch and extract text content from a given URL using Browserless', async () => {
    // Using a different URL for this test to differentiate from mcp-service tests
    // and ensure it's a page that's generally accessible and less likely to change drastically.
    const testUrl = 'https://www.theverge.com/google/670250/google-io-news-announcements-gemini-ai-android-xr'; 
    console.log(`[browserless-service.test] Testing with URL: ${testUrl}`);

    let allText = '';
    try {
      allText = await generateContentForUrl(testUrl);
      console.log("\n--- Start of Browserless allText ---");
      console.log(allText);
      console.log("--- End of Browserless allText ---\n");
    } catch (error) {
      console.error("[browserless-service.test] Error during test:", error);
      // Re-throw the error to make the test fail if generateContentForUrl throws
      throw error;
    }

    expect(allText).toBeTypeOf('string');
    // Add a more specific assertion, e.g., that the text is not empty
    // or contains some expected substring if possible and stable.
    expect(allText.trim().length).toBeGreaterThan(100); // Check for a reasonable amount of text
    console.log("[browserless-service.test] Successfully retrieved non-empty and expected content.");

  }, 30000); // Increase timeout to 30 seconds for network operations
}); 