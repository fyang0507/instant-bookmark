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

// Helper function to create a File object from a buffer
function createImageFileFromBuffer(buffer: Uint8Array, clientFilename?: string): File {
  let filename = clientFilename;
  if (!filename || filename.trim() === '') {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(today.getDate()).padStart(2, '0');
    filename = `temp_${year}-${month}-${day}.png`; // Default filename
  }

  // Ensure filename has an extension, default to .png if not.
  // This is a good practice though Cloudflare Images might also infer/set type.
  if (!/\.[^/.]+$/.test(filename)) {
      filename += '.png';
  }

  // For now, we assume 'image/png'. This could be made more dynamic if needed.
  // For example, by trying to infer from the filename extension or a separate mimeType parameter.
  const mimeType = 'image/png'; 
  return new File([buffer], filename, { type: mimeType });
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

    // --- Handle ingest based on type ---
    if (body.type === 'url') {
      if (!body.url) {
        return json({ ok: false, error: 'URL (url) is required when type is "url"' }, 400);
      }
      // All URL-specific logic (try-catch block) goes here
      try {
        let title = body.title;
        let summary = body.summary;

        if (body.autoGenerate) {
          const allText = await generateContentForUrl(body.url);
          const generatedSummary = await generateTitleAndSummaryForText(allText, env);
          title = title || generatedSummary.title;
          summary = summary || generatedSummary.summary;
        }

        const notionReqBody = {
          title: title,
          summary: summary,
          source: 'url',
          url: body.url,
          thoughts: body.thoughts,
        };
        const notionReq = new Request('http://dummy/save-to-notion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': env.API_ACCESS_KEY },
          body: JSON.stringify(notionReqBody),
        }) as unknown as CfRequest;

        const notionRes = await handleSaveToNotionPost(notionReq, env);
        if (!notionRes.ok) {
          const err = await notionRes.text();
          return json({ ok: false, error: 'Notion error: ' + err }, 500);
        }
        return json({ ok: true });
      } catch (e) {
        return json({ ok: false, error: (e instanceof Error ? e.message : String(e)) }, 500);
      }
    } else if (body.type === 'image') {
      if (!body.data_b64) {
        return json({ ok: false, error: 'Base64 image data (data_b64) is required when type is "image"' }, 400);
      }
      // All Image-specific logic (try-catch block) goes here
      try {
        let title = body.title;
        let summary = body.summary;

        const buffer = Uint8Array.from(atob(body.data_b64), c => c.charCodeAt(0));
        const file = createImageFileFromBuffer(buffer, body.filename);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('autoGenerate', body.autoGenerate.toString());

        if (!body.autoGenerate) {
          if (title) {
            formData.append('manualTitle', title);
          } else {
            console.warn("[ingest.ts] autoGenerate is false, but no title provided for image.");
          }
          if (summary) {
            formData.append('manualSummary', summary);
          } else {
            console.warn("[ingest.ts] autoGenerate is false, but no summary provided for image.");
          }
        } else {
          if (title) formData.append('manualTitle', title);
          if (summary) formData.append('manualSummary', summary);
        }

        const processScreenshotReq = new Request('http://dummy/process-screenshot', {
          method: 'POST',
          headers: { 'X-API-Key': env.API_ACCESS_KEY },
          body: formData,
        }) as unknown as CfRequest;

        const processScreenshotRes = await handleProcessScreenshotPost(processScreenshotReq, env);

        if (!processScreenshotRes.ok) {
          const err = await processScreenshotRes.text();
          return json({ ok: false, error: 'Process screenshot error: ' + err }, 500);
        }
        
        const screenshotData = await processScreenshotRes.json() as ProcessedScreenshotResponse;
        const uploadId = screenshotData.uploadId;

        title = screenshotData.title;
        summary = screenshotData.summary;

        const notionReqBody = {
          title: title,
          summary: summary,
          source: 'screenshot',
          uploadId: uploadId,
          thoughts: body.thoughts,
        };
        const notionReq = new Request('http://dummy/save-to-notion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': env.API_ACCESS_KEY },
          body: JSON.stringify(notionReqBody),
        }) as unknown as CfRequest;

        const notionRes = await handleSaveToNotionPost(notionReq, env);
        if (!notionRes.ok) {
          const err = await notionRes.text();
          return json({ ok: false, error: 'Notion error: ' + err }, 500);
        }
        return json({ ok: true });
      } catch (e) {
        return json({ ok: false, error: (e instanceof Error ? e.message : String(e)) }, 500);
      }
    } else {
      // This catches cases where type is missing, or is an unsupported value like 'video', null, etc.
      return json({ ok: false, error: 'Invalid or missing "type" in payload. Must be "url" or "image".' }, 400);
    }
  }
};
