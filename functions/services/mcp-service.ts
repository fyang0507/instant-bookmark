import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";


/**
 * Fetches the content of a URL using Playwright MCP.
 *
 * @param url The URL to process.
 * @returns A promise that resolves to the flattened text content of the URL.
 */
export async function generateContentForUrl(
  url: string
  // env: Env, // Removed as it's no longer used directly in this function after refactor
): Promise<string> { // Returns string (allText) instead of LlmContentResponse
  console.log(`[mcp-service] Fetching content for URL via Playwright MCP (stdio): ${url}`);

  // Initialize StdioClientTransport to manage the Playwright MCP process
  const transport = new StdioClientTransport({
    command: "npx",
    // Includes --headless as per Python example and typical server-side usage
    args: ["-y", "@playwright/mcp@latest", "--headless"], 
    // logging: "info" // Removed: Property 'logging' does not exist on StdioServerParameters
  });

  // Instantiate the MCP Client from the SDK
  const client = new Client({
    name: "instant-bookmark-mcp-client", // Application-specific name
    version: "0.1.0",                   // Application-specific version
  });

  await client.connect(transport);

  try {
    // --- Drive the browser ---
    console.log(`[mcp-service] Navigating to URL: ${url}`);
    await client.callTool({ name: 'browser_navigate', arguments: { url } });
    // Increased wait time for potentially slower pages or SPAs.
    await client.callTool({ name: 'browser_wait_for', arguments: { time: 2 } }); 
    console.log(`[mcp-service] Navigation and wait complete for: ${url}`);

    // --- Grab the accessibility snapshot ---
    console.log(`[mcp-service] Taking browser snapshot for: ${url}`);

    // Define a minimal type for the snapshot result
    interface BrowserSnapshotResult {
      content: Array<{ text: string; [key: string]: unknown }>;
      [key: string]: unknown; // Allow other properties
    }

    const snap = await client.callTool({ name: 'browser_snapshot', arguments: {} }) as BrowserSnapshotResult;
    const allText = snap.content[0].text;
    console.log(`[mcp-service] Snapshot taken and text flattened for: ${url}. Length: ${allText.length}`);
    
    return allText;

  } catch (error: unknown) {
    console.error(`[mcp-service] Error in generateContentForUrl with Playwright MCP for URL ${url}:`, error);
    let errorMessage = 'Failed to fetch content using Playwright MCP.';
    if (error instanceof Error) {
        errorMessage = `Playwright MCP Error: ${error.message}`;
    }
    throw new Error(errorMessage); 
  } finally {
    // --- Close client and transport ---
    if (client && typeof client.close === 'function') {
      try {
        await client.close();
        console.log(`[mcp-service] MCP Client closed for: ${url}`);
      } catch (closeError) {
        console.error(`[mcp-service] Error closing MCP Client for ${url}:`, closeError);
      }
    }
    // StdioClientTransport might also have a close/dispose method,
    // or its lifecycle is managed by the client.close().
    // If explicit transport close is needed, it would be added here.
    // For now, assuming client.close() handles underlying resources.
  }
} 