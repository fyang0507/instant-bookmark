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
import { generateTitleAndSummaryForText } from '../services/llm-service';
import { handleSaveToNotionPost } from './save-to-notion';
import { handleProcessScreenshotPost } from './process-screenshot';
import type { ProcessedScreenshotResponse } from './process-screenshot';

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
  thoughts?: string;
  autoGenerate: boolean;
  title?: string;
  summary?: string;
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

    // --- Validate autoGenerate, title, and summary ---
    if (body.autoGenerate === false) {
      if (!body.title || body.title.trim() === '') {
        return json({ ok: false, error: 'Title is required and cannot be empty when autoGenerate is false' }, 400);
      }
      if (!body.summary || body.summary.trim() === '') {
        return json({ ok: false, error: 'Summary is required and cannot be empty when autoGenerate is false' }, 400);
      }
    }

    // --- Handle URL ingest ---
    if (body.type === 'url' && body.url) {
      try {
        let title = body.title;
        let summary = body.summary;

        if (body.autoGenerate) { // autoGenerate is now a required boolean
          // 1. Extract text from URL
          const allText = await generateContentForUrl(body.url);
          // 2. Summarize
          const generatedSummary = await generateTitleAndSummaryForText(allText, env);
          title = title || generatedSummary.title; // Use provided title if available, otherwise use generated
          summary = summary || generatedSummary.summary; // Use provided summary if available, otherwise use generated
        }

        // 3. Save to Notion
        const notionReqBody = {
          title: title,
          summary: summary,
          source: 'url',
          url: body.url,
          thoughts: body.thoughts,
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
        let title = body.title;
        let summary = body.summary;

        // 1. Convert base64 to File
        const buffer = Uint8Array.from(atob(body.data_b64), c => c.charCodeAt(0));
        const file = new File([buffer], body.filename, { type: 'image/png' }); // Assuming PNG, adjust if other types are possible

        // 2. Process screenshot (uploads to Cloudflare Images and generates summary if needed)
        const formData = new FormData();
        formData.append('file', file);
        
        // Pass autoGenerate, title, and summary to process-screenshot
        // process-screenshot expects autoGenerate as a string 'true' or 'false'
        formData.append('autoGenerate', body.autoGenerate.toString()); 

        if (!body.autoGenerate) {
          if (title) {
            formData.append('manualTitle', title);
          } else {
            // If autoGenerate is false, and no title is provided, this is an issue.
            // process-screenshot will handle this error, but good to be aware.
            console.warn("[ingest.ts] autoGenerate is false, but no title provided for image.");
          }
          if (summary) {
            formData.append('manualSummary', summary);
          } else {
            // If autoGenerate is false, and no summary is provided, this is an issue.
            console.warn("[ingest.ts] autoGenerate is false, but no summary provided for image.");
          }
        } else {
          // If auto-generating, still pass title/summary if provided, 
          // process-screenshot might use them as a fallback or hint (though current version doesn't)
          if (title) formData.append('manualTitle', title); 
          if (summary) formData.append('manualSummary', summary);
        }

        // Construct a new Request object for handleProcessScreenshotPost
        const processScreenshotReq = new Request('http://dummy/process-screenshot', {
          method: 'POST',
          headers: { 'X-API-Key': env.API_ACCESS_KEY }, // Content-Type is set by FormData
          body: formData,
        }) as unknown as CfRequest;

        const processScreenshotRes = await handleProcessScreenshotPost(processScreenshotReq, env);

        if (!processScreenshotRes.ok) {
          const err = await processScreenshotRes.text();
          return json({ ok: false, error: 'Process screenshot error: ' + err }, 500);
        }
        
        const screenshotData = await processScreenshotRes.json() as ProcessedScreenshotResponse;
        const uploadId = screenshotData.uploadId; // Assign as const

        // Update title and summary if they were generated or passed through
        title = screenshotData.title; 
        summary = screenshotData.summary;

        // 3. Save to Notion
        const notionReqBody = {
          title: title, // Use the title from screenshotData (either generated or passed through)
          summary: summary, // Use the summary from screenshotData
          source: 'screenshot',
          uploadId: uploadId,
          thoughts: body.thoughts,
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
