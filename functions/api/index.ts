// functions/api/index.ts
import { handleProcessUrlPost } from './process-url';
import { Env as ProcessUrlEnv } from './process-url';

import { handleProcessScreenshotPost } from './process-screenshot';
import { Env as ProcessScreenshotEnv } from './process-screenshot';

import { handleSaveToNotionPost } from './save-to-notion';
import { Env as SaveToNotionEnv } from './save-to-notion';

import type { Request as CfRequest, ExecutionContext } from '@cloudflare/workers-types';
import { getAssetFromKV, NotFoundError, MethodNotAllowedError } from '@cloudflare/kv-asset-handler';

// @ts-expect-error wrangler magically provides this manifest
import manifestJSON from '__STATIC_CONTENT_MANIFEST';
const assetManifest = JSON.parse(manifestJSON);

// MyWorkerEnv combines Env types from all handlers.
interface MyWorkerEnv extends ProcessUrlEnv, ProcessScreenshotEnv, SaveToNotionEnv { 
  // This is the KV Namespace for static assets, temporarily type as any to bypass complex type issues
  __STATIC_CONTENT: any; 
  [key: string]: unknown;
}

export default {
  async fetch(
    request: CfRequest, 
    env: MyWorkerEnv,
    ctx: ExecutionContext // Required by getAssetFromKV for waitUntil
  ): Promise<Response> { 
    // Existing detailed logging can be kept or removed once this is working
    console.log("[Worker] Fetch handler invoked (using kv-asset-handler).");
    console.log("[Worker] env object keys:", Object.keys(env).join(', '));
    console.log("[Worker] typeof env.__STATIC_CONTENT:", typeof env.__STATIC_CONTENT);
    if (env.__STATIC_CONTENT && typeof env.__STATIC_CONTENT === 'object') {
      console.log("[Worker] env.__STATIC_CONTENT.get exists:", typeof env.__STATIC_CONTENT.get === 'function');
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

    // Use kv-asset-handler to serve static assets
    try {
      console.log(`[Worker] Attempting to serve static asset via getAssetFromKV for: ${url.pathname}`);
      return await getAssetFromKV(
        {
          request: request as unknown as Request,
          waitUntil(promise) {
            return ctx.waitUntil(promise);
          },
        },
        {
          ASSET_NAMESPACE: env.__STATIC_CONTENT,
          ASSET_MANIFEST: assetManifest,
        }
      );
    } catch (e: unknown) {
      if (e instanceof NotFoundError) {
        console.log(`[Worker] Asset not found by getAssetFromKV for: ${url.pathname}.`);
        // You can return a custom 404 page here if you have one, e.g., by fetching '/404.html'
        // For SPA, often you'd return index.html for paths not found
        // let notFoundResponse = await getAssetFromKV(
        //   {
        //     request,
        //     waitUntil(promise) {
        //       return ctx.waitUntil(promise);
        //     },
        //   },
        //   {
        //     ASSET_NAMESPACE: env.__STATIC_CONTENT,
        //     ASSET_MANIFEST: assetManifest,
        //     mapRequestToAsset: req => new Request(`${new URL(req.url).origin}/index.html`, req),
        //   }
        // );
        // return new Response(notFoundResponse.body, { ...notFoundResponse, status: 404 });
        return new Response('Not found', { status: 404 });
      } else if (e instanceof MethodNotAllowedError) {
        console.log(`[Worker] Method not allowed by getAssetFromKV for: ${url.pathname}.`);
        return new Response('Method not allowed', { status: 405 });
      } else {
        let errorMessage = 'Unknown error serving static asset';
        if (e instanceof Error) {
          errorMessage = e.message;
        }
        console.error('[Worker] Error during getAssetFromKV:', errorMessage, e);
        return new Response('An unexpected error occurred', { status: 500 });
      }
    }
  },
}; 