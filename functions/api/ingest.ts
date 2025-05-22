// functions/api/ingest.ts
// This file is the entry point for the ingest API.
// It streamlines the ingestion of URLs and screenshots, and saves them to Notion.
// It will be used by ios shortcut and raycast integration.
import type { 
    Request as CfRequest, 
    Response as CfResponse, 
    // ExecutionContext // Removed as _ctx parameter was removed
} from '@cloudflare/workers-types';
import type { Env as SaveToNotionEnv } from './save-to-notion';
import { generateContentForUrl } from '../services/browserless-service';
import { generateTitleAndSummaryForText, generateContentForScreenshot } from '../services/llm-service';
import { handleSaveToNotionPost } from './save-to-notion';

// Define Env for this worker script
export interface Env extends SaveToNotionEnv {
  API_ACCESS_KEY: string;
  // Add other environment variables specific to this worker if any
}

interface IngestBody {
  type: 'url' | 'image';
  url?: string;
  filename?: string;
  data_b64?: string;
}

// Use CfResponse and CfHeaders for consistency with other CF-typed functions
function json(data: unknown, status = 200): CfResponse {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  ) as unknown as CfResponse; // Force cast via unknown - this remains necessary for the Response object itself
}

// Standard Worker entry point
export default {
  async fetch(
    request: CfRequest, // Use CfRequest
    env: Env,
    // _ctx: ExecutionContext // Removed as it's unused and causing a lint error
  ): Promise<CfResponse> { // Promise CfResponse
    // const url = new URL(request.url); // Unused for now
    // if (url.pathname !== '/api/ingest') { // Example routing, uncomment if worker handles multiple paths
    //   return new Response('Not the ingest endpoint', { status: 404 });
    // }

    // --- Only allow POST ---
    if (request.method !== 'POST')
      return json({ ok: false, error: 'Method not allowed' }, 405);

    // --- API Key Auth (X-API-Key header) ---
    const clientApiKey = request.headers.get('X-API-Key');
    if (!clientApiKey || clientApiKey !== env.API_ACCESS_KEY) {
      return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    // --- Parse body ---
    let body: IngestBody;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: 'Invalid JSON' }, 400);
    }

    // --- Handle URL ingest ---
    if (body.type === 'url' && body.url) {
      try {
        // 1. Extract text from URL
        const allText = await generateContentForUrl(body.url);
        // 2. Summarize
        const summary = await generateTitleAndSummaryForText(allText, env);
        // 3. Save to Notion
        const notionReqBody = {
          title: summary.title,
          summary: summary.summary,
          source: 'url',
          url: body.url,
        };
        // Construct a new Request object that is compliant with CfRequest for handleSaveToNotionPost
        const notionReq = new Request('http://dummy/save-to-notion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': env.API_ACCESS_KEY },
          body: JSON.stringify(notionReqBody),
        }) as unknown as CfRequest; // Force cast via unknown

        const notionRes = await handleSaveToNotionPost(notionReq, env);
        if (!notionRes.ok) {
          const err = await notionRes.text();
          return json({ ok: false, error: 'Notion error: ' + err }, 500);
        }
        return json({ ok: true });
      } catch (e) {
        return json({ ok: false, error: (e instanceof Error ? e.message : String(e)) }, 500);
      }
    }

    // --- Handle image ingest ---
    if (body.type === 'image' && body.filename && body.data_b64) {
      try {
        // 1. Convert base64 to File
        const buffer = Uint8Array.from(atob(body.data_b64), c => c.charCodeAt(0));
        const file = new File([buffer], body.filename, { type: 'image/png' });
        // 2. Summarize
        const summary = await generateContentForScreenshot(file, env);
        // 3. (Optional) Upload image to Notion (not implemented here, see process-screenshot)
        // 4. Save to Notion
        const notionReqBody = {
          title: summary.title,
          summary: summary.summary,
          source: 'screenshot',
        };
        const notionReq = new Request('http://dummy/save-to-notion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': env.API_ACCESS_KEY },
          body: JSON.stringify(notionReqBody),
        }) as unknown as CfRequest; // Force cast via unknown

        const notionRes = await handleSaveToNotionPost(notionReq, env);
        if (!notionRes.ok) {
          const err = await notionRes.text();
          return json({ ok: false, error: 'Notion error: ' + err }, 500);
        }
        return json({ ok: true });
      } catch (e) {
        return json({ ok: false, error: (e instanceof Error ? e.message : String(e)) }, 500);
      }
    }

    return json({ ok: false, error: 'Bad payload' }, 400);
  }
};
