import type { PagesFunction, EventContext, Request as CfRequest } from '@cloudflare/workers-types';
import type { Env, LlmContentResponse } from '../types'; // Import shared Env and LlmContentResponse
import { generateTitleAndSummaryForText } from '../services/llm-service'; // Import the LLM service for text processing
import { generateContentForUrl } from '../services/mcp-service'; // Import the MCP service for URL content extraction

// Define the expected request body for URL processing
interface ProcessUrlRequest {
  url: string;
}

// Define the expected response format
// Use LlmContentResponse directly as no additional fields are needed for this endpoint

// New handler for standard Worker signature, accepting CfRequest, no ctx
export async function handleProcessUrlPost(
  request: CfRequest, 
  env: Env
): Promise<Response> {
  try {
    // API Key Authentication
    const clientApiKey = request.headers.get('X-API-Key');
    if (!clientApiKey || clientApiKey !== env.API_ACCESS_KEY) {
      console.warn('[process-url] Unauthorized API access attempt');
      return new Response('Unauthorized: Invalid or missing API Key', { status: 401 });
    }

    // Validate request body
    if (request.headers.get('Content-Type') !== 'application/json') {
      return new Response('Invalid Content-Type. Expected application/json', { status: 415 });
    }

    let reqBody: ProcessUrlRequest;
    try {
      reqBody = await request.json() as ProcessUrlRequest;
    } catch (e: unknown) {
      let errorMessage = 'Invalid JSON payload';
      if (e instanceof Error) {
        errorMessage = `Invalid JSON payload: ${e.message}`;
      } else if (typeof e === 'string') {
        errorMessage = `Invalid JSON payload: ${e}`;
      }
      console.error('[process-url] Error parsing JSON:', errorMessage);
      return new Response(errorMessage, { status: 400 });
    }
    
    if (!reqBody || typeof reqBody.url !== 'string' || !reqBody.url.trim()) {
      return new Response('Missing or invalid URL in request body', { status: 400 });
    }

    // Call the LLM service to generate title and summary
    console.log(`[process-url] Extracting text content for URL: ${reqBody.url} using Playwright MCP...`);
    // Step 1: Get the raw text content from the URL
    const rawTextContent = await generateContentForUrl(reqBody.url);
    console.log(`[process-url] Text content extracted for URL: ${reqBody.url}. Length: ${rawTextContent.length}`);

    // Step 2: Generate title and summary from the extracted text
    console.log(`[process-url] Generating title and summary for extracted text from URL: ${reqBody.url}`);
    const llmContent = await generateTitleAndSummaryForText(rawTextContent, env);
    console.log(`[process-url] LLM title and summary generated for URL: ${reqBody.url}.`);

    // The responseBody will directly be of type LlmContentResponse
    const responseBody: LlmContentResponse = {
      title: llmContent.title,
      summary: llmContent.summary,
    };

    // TODO: add fallback to mcp vision mode if snapshot mode fails

    return new Response(JSON.stringify(responseBody), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: unknown) {
    console.error('[process-url] Error processing request:', error instanceof Error ? error.message : error);
    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    }
    return new Response(errorMessage, { status: 500 });
  }
}

export const onRequestPost = (async (context: EventContext<Env, string, unknown>) => {
  // This Pages Function can now call the new worker-style handler, no ctx needed for handleProcessUrlPost
  return handleProcessUrlPost(context.request, context.env); 
}) as unknown as PagesFunction<Env>;

// Fallback for other methods (GET, PUT, DELETE etc.)
export const onRequest = (async (context: EventContext<Env, string, unknown>) => {
  const { request, env } = context;
  const clientApiKey = request.headers.get('X-API-Key');
  if (request.method !== 'POST') {
    if (!clientApiKey || clientApiKey !== env.API_ACCESS_KEY) {
      console.warn('[process-url] Unauthorized API access attempt to non-POST endpoint');
      return new Response('Unauthorized: Invalid or missing API Key', { status: 401 });
    }
    return new Response(`Method ${request.method} Not Allowed`, { status: 405, headers: { 'Allow': 'POST' } });
  }
  return new Response('Please use POST method to process a URL.', { status: 405 });
}) as unknown as PagesFunction<Env>; 