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

    return new Response('Resource not found.', { status: 404 });
  },
}; 