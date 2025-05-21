import { describe, it, expect } from 'vitest';
import { generateContentForUrl } from '../mcp-service';

describe('MCP Service - generateContentForUrl', () => {
  it('should fetch and extract text content from a given URL', async () => {
    const testUrl = 'https://36kr.com/p/3292470512503040';
    console.log(`[mcp-service.test] Testing with URL: ${testUrl}`);

    let allText = '';
    try {
      allText = await generateContentForUrl(testUrl);
      console.log("\n--- Start of allText ---");
      console.log(allText);
      console.log("--- End of allText ---\n");
    } catch (error) {
      console.error("[mcp-service.test] Error during test:", error);
      // Re-throw the error to make the test fail if generateContentForUrl throws
      throw error;
    }

    expect(allText).toBeTypeOf('string');
    // Add a more specific assertion, e.g., that the text is not empty
    // or contains some expected substring if possible and stable.
    expect(allText.trim().length).toBeGreaterThan(0);
    console.log("[mcp-service.test] Successfully retrieved non-empty content.");

  }, 30000); // Increase timeout to 30 seconds for network operations
}); 