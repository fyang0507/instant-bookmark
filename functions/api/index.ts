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
  ): Promise<Response> { 
    const url = new URL(request.url);

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
      return new Response('API endpoint not found.', { status: 404 });
    }

    // For any other request, try to serve it from static assets
    // (e.g., index.html for '/', or other assets like CSS, JS)
    try {
      // env.__STATIC_CONTENT is automatically populated by Wrangler when you have [site]
      // in your wrangler.toml and it points to your 'dist' (or other) asset folder.
      return await env.__STATIC_CONTENT.fetch(request);
    } catch (e) {
      // This can happen if the asset isn't found in the static content namespace
      // or if there's an issue with the binding itself.
      console.error("Failed to serve static content:", e);
      return new Response('Resource not found.', { status: 404 });
    }
  },
}; 