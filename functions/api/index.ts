// functions/api/index.ts
import { handleProcessUrlPost } from './process-url';
import { Env as ProcessUrlEnv } from './process-url';

import { handleProcessScreenshotPost } from './process-screenshot';
import { Env as ProcessScreenshotEnv } from './process-screenshot';

import { handleSaveToNotionPost } from './save-to-notion';
import { Env as SaveToNotionEnv } from './save-to-notion';

import type { Request as CfRequest } from '@cloudflare/workers-types';

// MyWorkerEnv combines Env types from all handlers.
interface MyWorkerEnv extends ProcessUrlEnv, ProcessScreenshotEnv, SaveToNotionEnv { 
  // This binding is provided by Cloudflare Workers when [site] config is used
  // It gives access to the static assets uploaded from the "bucket" directory
  __STATIC_CONTENT: { fetch: (request: CfRequest) => Promise<Response> };
  [key: string]: unknown;
}

export default {
  async fetch(
    request: CfRequest, 
    env: MyWorkerEnv
    // Consider adding ctx: ExecutionContext if you need it for other purposes
  ): Promise<Response> { 
    console.log("[Worker] Fetch handler invoked.");
    console.log("[Worker] env object keys:", Object.keys(env).join(', '));
    console.log("[Worker] typeof env.__STATIC_CONTENT:", typeof env.__STATIC_CONTENT);
    if (env.__STATIC_CONTENT) {
      console.log("[Worker] env.__STATIC_CONTENT object keys (if object):", typeof env.__STATIC_CONTENT === 'object' && env.__STATIC_CONTENT !== null ? Object.keys(env.__STATIC_CONTENT).join(', ') : 'Not an object or null');
      console.log("[Worker] env.__STATIC_CONTENT.fetch exists:", typeof env.__STATIC_CONTENT.fetch === 'function');
    } else {
      console.log("[Worker] env.__STATIC_CONTENT is null or undefined.");
    }

    const url = new URL(request.url);
    console.log(`[Worker] Request received for: ${request.url}, Pathname: ${url.pathname}`);

    try {
      if (url.pathname === '/api/process-url') {
        return await handleProcessUrlPost(request, env);
      } else if (url.pathname === '/api/process-screenshot') {
        return await handleProcessScreenshotPost(request, env);
      } else if (url.pathname === '/api/save-to-notion') {
        return await handleSaveToNotionPost(request, env);
      }
    } catch (e) {
      console.error("Error in API routing:", e);
      return new Response("Internal Server Error in API router", { status: 500 });
    }

    if (url.pathname.startsWith('/api/')) {
      console.log(`[Worker] API endpoint not found for: ${url.pathname}`);
      return new Response('API endpoint not found.', { status: 404 });
    }

    console.log("[Worker] Attempting to serve static asset.");

    if (!env.__STATIC_CONTENT || typeof env.__STATIC_CONTENT.fetch !== 'function') {
      console.error("[Worker] Error: env.__STATIC_CONTENT binding is missing or not a valid fetcher.");
      return new Response('Static content environment not configured.', { status: 500 });
    }

    try {
      console.log(`[Worker] Calling env.__STATIC_CONTENT.fetch for: ${url.pathname}`);
      const assetResponse = await env.__STATIC_CONTENT.fetch(request);
      console.log(`[Worker] env.__STATIC_CONTENT.fetch responded with status: ${assetResponse.status} for: ${url.pathname}`);
      
      // If assetResponse is a 404, it means the asset was not found in the KV store by the handler.
      // We just return that response directly.
      if (assetResponse.status === 404) {
        console.log(`[Worker] Asset not found by __STATIC_CONTENT.fetch for: ${url.pathname}. Returning 404 from asset handler.`);
      }
      return assetResponse;

    } catch (e: unknown) {
      let errorMessage = 'Unknown error';
      let errorStack = 'No stack available';
      if (e instanceof Error) {
        errorMessage = e.message;
        errorStack = e.stack || errorStack;
      }
      console.error(`[Worker] Error during env.__STATIC_CONTENT.fetch for ${url.pathname}:`, errorMessage, errorStack);
      return new Response('Resource not found due to an error serving static content.', { status: 404 });
    }
  },
}; 