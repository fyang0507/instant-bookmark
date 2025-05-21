/**
 * Fetches and returns visible text from a URL using Browserless → BrowserQL.
 *
 * Requires an environment variable `BROWSERLESS_TOKEN`.
 * Free plan ✦ 1,000 units / month (≈16h browser time).
 * Ref: https://www.browserless.io/
 */

// Helper function for fetch with timeout
async function fetchWithTimeout(
  resource: string | URL | Request,
  options: RequestInit = {},
  timeout: number = 30000 // Default timeout 30 seconds
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    // If the error is an AbortError, throw a custom timeout error message
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout / 1000} seconds`);
    }
    // Re-throw other errors
    throw error;
  }
}

export async function generateContentForUrl(url: string): Promise<string> {
    console.log(`[browserql-service] Fetching content via BrowserQL: ${url}`);
  
    const endpoint =
      `https://production-sfo.browserless.io/chromium/bql?token=${process.env.BROWSERLESS_TOKEN}`;
    /** BrowserQL mutation:
     * 1. open the page (`goto`) and wait for firstContentfulPaint
     * 2. return the page's visible text (`text`)
     * Note: server side default timeout is 30 seconds
     */
    const query = /* GraphQL */ `
      mutation Scrape($target: String!) {
        goto(url: $target, waitUntil: firstContentfulPaint) { status time }
        pageText: text { text } # full‑page visible text
      }
    `;
  
    // Define interfaces for the expected GraphQL response
    interface BrowserQLResponseData {
      goto: {
        status: number;
        time: number;
      };
      pageText: {
        text: string;
      };
    }

    interface BrowserQLErrorDetail {
      message: string;
      // Add other potential error fields if known, e.g., path, locations
    }

    interface BrowserQLResponse {
      data?: BrowserQLResponseData;
      errors?: BrowserQLErrorDetail[];
    }
  
    const fetchOptions: RequestInit = {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables: { target: url } }),
    };

    try {
      // Use fetchWithTimeout instead of direct fetch
      const res = await fetchWithTimeout(endpoint, fetchOptions, 45000); // Example: 45-second timeout for this specific call
    
      if (!res.ok) {
        // Attempt to read the response body for more detailed error messages from Browserless
        let errorBody = 'Unknown error from Browserless';
        try {
          errorBody = await res.text();
        } catch {
          // Ignore if reading body fails, errorBody will retain its default value
        }
        throw new Error(`BrowserQL HTTP ${res.status}: ${errorBody}`);
      }
    
      const json = await res.json() as BrowserQLResponse;
  
      if (json.errors && json.errors.length > 0) {
        throw new Error(`BrowserQL error: ${JSON.stringify(json.errors)}`);
      }

      if (!json.data || !json.data.pageText || typeof json.data.pageText.text !== 'string') {
        throw new Error('BrowserQL error: Invalid data structure in response.');
      }
  
      const allText: string = json.data.pageText.text;
      console.log(
        `[browserql-service] Text extraction complete. Length: ${allText.length}`
      );
      return allText;
    } catch (error) {
      // Log the more specific timeout error or other fetch errors
      console.error(`[browserql-service] Error fetching from Browserless for URL ${url}:`, error);
      throw error; // Re-throw the error to be handled by the caller or test
    }
  }