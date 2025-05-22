// functions/api/ingest.ts
// This file is the entry point for the ingest API.
// It streamlines the ingestion of URLs and screenshots, and saves them to Notion.
// It will be used by ios shortcut and raycast integration.
import type { PagesFunction, Request as CfRequest, EventContext, Response as CfResponse, Headers as CfHeaders, ResponseInit, HeadersInit } from '@cloudflare/workers-types';
import type { Env } from './save-to-notion';
import { generateContentForUrl } from '../services/mcp-service';
import { generateTitleAndSummaryForText, generateContentForScreenshot } from '../services/llm-service';
import { handleSaveToNotionPost } from './save-to-notion';

interface IngestBody {
  type: 'url' | 'image';
  url?: string;
  filename?: string;
  data_b64?: string;
}

// --- Minimal JSON response helper ---
function json(data: unknown, status = 200): CfResponse {
  return new (Response as unknown as { new(body: string, init: ResponseInit): CfResponse })(
    JSON.stringify(data),
    {
      status,
      headers: new (Headers as unknown as { new(init?: HeadersInit): CfHeaders })({ 'Content-Type': 'application/json' }),
    }
  );
}

export const onRequest: PagesFunction<Env> = async (context: EventContext<Env, string, Record<string, unknown>>) => {
  const { request, env } = context;
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
      const notionReq = new Request('http://dummy/save-to-notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': env.API_ACCESS_KEY },
        body: JSON.stringify({
          title: summary.title,
          summary: summary.summary,
          source: 'url',
          url: body.url,
        }),
      });
      // Cast to CfRequest for compatibility
      const notionRes = await handleSaveToNotionPost(notionReq as unknown as CfRequest, env);
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
      const notionReq = new Request('http://dummy/save-to-notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': env.API_ACCESS_KEY },
        body: JSON.stringify({
          title: summary.title,
          summary: summary.summary,
          source: 'screenshot',
          // uploadId: ... (if you have a Notion upload step)
        }),
      });
      // Cast to CfRequest for compatibility
      const notionRes = await handleSaveToNotionPost(notionReq as unknown as CfRequest, env);
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
};
