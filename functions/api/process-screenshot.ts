import type { PagesFunction, EventContext, Request as CfRequest } from '@cloudflare/workers-types';
import type { Env, LlmContentResponse } from '../types'; // Import shared Env and LlmContentResponse
import { generateContentForScreenshot } from '../services/llm-service'; // Import the LLM service

export type { Env } from '../types'; // Re-export Env

// Define the expected response format
export interface ProcessedScreenshotResponse extends LlmContentResponse { // Extend LlmContentResponse
  uploadId: string; 
}

// Helper function to upload file to Notion and get uploadId
async function uploadFileToNotion(file: File, env: Env, notionVersion: string): Promise<{ uploadId: string }> {
  // Step 1: Create Notion file upload (get upload URL and ID)
  const createUploadPayload = {
    name: file.name,
    mime_type: file.type || 'application/octet-stream',
    mode: 'single_part',
  };
  console.log(`[process-screenshot:uploadFileToNotion] Creating Notion file upload for ${file.name}...`, createUploadPayload);

  const createUploadResponse = await fetch('https://api.notion.com/v1/file_uploads', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.NOTION_API_KEY}`,
      'Notion-Version': notionVersion,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createUploadPayload),
  });

  if (!createUploadResponse.ok) {
    const errorText = await createUploadResponse.text();
    console.error('[process-screenshot:uploadFileToNotion] Notion create file upload failed:', createUploadResponse.status, errorText);
    throw new Error(`Failed to initiate screenshot upload with Notion: ${errorText} (Status: ${createUploadResponse.status})`);
  }

  const uploadData = await createUploadResponse.json() as { id: string; upload_url: string; [key: string]: unknown };
  const uploadId = uploadData.id;
  const sendUrl = uploadData.upload_url;

  if (!uploadId || !sendUrl) {
    console.error('[process-screenshot:uploadFileToNotion] Notion create file upload response missing id or url:', uploadData);
    throw new Error('Invalid response from Notion API when creating file upload.');
  }
  console.log(`[process-screenshot:uploadFileToNotion] Notion upload initiated. Upload ID: ${uploadId}, Send URL: ${sendUrl}`);

  // Step 2: Send file bytes to the obtained URL
  const fileFormData = new FormData();
  fileFormData.append('file', file, file.name);
  console.log(`[process-screenshot:uploadFileToNotion] Sending file bytes for ${file.name} to ${sendUrl}...`);

  const sendFileResponse = await fetch(sendUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.NOTION_API_KEY}`,
      'Notion-Version': notionVersion,
      // Content-Type for FormData is set by the browser/fetch automatically
    },
    body: fileFormData,
  });

  if (!sendFileResponse.ok) {
    const errorText = await sendFileResponse.text();
    console.error('[process-screenshot:uploadFileToNotion] Notion send file bytes failed:', sendFileResponse.status, errorText);
    throw new Error(`Failed to send screenshot data to Notion: ${errorText} (Status: ${sendFileResponse.status})`);
  }
  
  console.log(`[process-screenshot:uploadFileToNotion] File bytes sent successfully for ${uploadId}.`);
  return { uploadId };
}

// New handler for standard Worker signature, accepting CfRequest, no ctx
export async function handleProcessScreenshotPost(
  request: CfRequest,
  env: Env
): Promise<Response> {
  const notionVersion = '2022-06-28'; // Standard Notion API version

  try {
    // API Key Authentication
    const clientApiKey = request.headers.get('X-API-Key');
    if (!clientApiKey || clientApiKey !== env.API_ACCESS_KEY) {
      console.warn('[process-screenshot] Unauthorized API access attempt');
      return new Response('Unauthorized: Invalid or missing API Key', { status: 401 });
    }

    // Validate request body as FormData
    const contentType = request.headers.get('Content-Type');
    if (!contentType || !contentType.startsWith('multipart/form-data')) {
      return new Response('Invalid Content-Type. Expected multipart/form-data', { status: 415 });
    }

    try {
      const formData = await request.formData();
      const fileValue = formData.get('file'); // Use a different name to avoid conflict with global File
      
      const autoGenerateStr = formData.get('autoGenerate') as string | null;
      const isAutoGenerateEnabled = autoGenerateStr === 'true'; // Relies on client sending 'true' or 'false'
      
      let manualTitle: string | null = null;
      let manualSummary: string | null = null;

      if (!isAutoGenerateEnabled) {
        manualTitle = formData.get('manualTitle') as string | null;
        manualSummary = formData.get('manualSummary') as string | null;
        if (!manualTitle || !manualSummary) {
          console.error('[process-screenshot] Manual title or summary missing when autoGenerate is false.');
          return new Response('Manual title and summary are required when auto-generation is disabled.', { status: 400 });
        }
      }
      
      if (!fileValue || typeof fileValue === 'string' || 
          typeof (fileValue as File).name === 'undefined' || 
          typeof (fileValue as File).size === 'undefined') { 
        return new Response('Missing or invalid \'file\' in FormData', { status: 400 });
      }
      
      const file = fileValue as File;
      
      // --- Notion File Upload --- 
      // This step is always performed if a file is present.
      console.log(`[process-screenshot] Initiating Notion file upload for ${file.name}...`);
      const { uploadId } = await uploadFileToNotion(file, env, notionVersion);
      console.log(`[process-screenshot] Notion upload successful. Upload ID: ${uploadId}`);
      // --- End Notion File Upload --- 

      // Call the LLM service to generate title and summary
      let title: string;
      let summary: string;

      if (isAutoGenerateEnabled) {
        console.log(`[process-screenshot] Step 3: Generating content for screenshot ${uploadId} using LLM service (autoGenerate=true)...`);
        const llmContent = await generateContentForScreenshot(file, env);
        title = llmContent.title;
        summary = llmContent.summary;
        console.log(`[process-screenshot] Step 3 successful. LLM content received for ${uploadId}.`);
      } else {
        console.log(`[process-screenshot] Step 3: Using manual title and summary for screenshot ${uploadId} (autoGenerate=false)...`);
        title = manualTitle as string; // Already checked for null above
        summary = manualSummary as string; // Already checked for null above
        console.log(`[process-screenshot] Step 3 successful. Manual content set for ${uploadId}.`);
      }

      const responseBody: ProcessedScreenshotResponse = {
        title: title,
        summary: summary,
        uploadId: uploadId,
      };

      return new Response(JSON.stringify(responseBody), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });

    } catch (e: unknown) {
      let errorMessage = 'Invalid FormData payload or file issue';
      if (e instanceof Error) {
        errorMessage = `Invalid FormData payload or file issue: ${e.message}`;
      } else if (typeof e === 'string') {
        errorMessage = `Invalid FormData payload or file issue: ${e}`;
      }
      console.error('[process-screenshot] Error processing FormData/file:', errorMessage);
      return new Response(errorMessage, { status: 400 });
    }

  } catch (error: unknown) {
    console.error('[process-screenshot] Error processing request:', error instanceof Error ? error.message : error);
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
  // Call worker-style handler, no ctx needed for handleProcessScreenshotPost
  return handleProcessScreenshotPost(context.request, context.env);
}) as unknown as PagesFunction<Env>;

// Fallback for other methods (GET, PUT, DELETE etc.)
export const onRequest = (async (context: EventContext<Env, string, unknown>) => {
  const { request, env } = context;
  const clientApiKey = request.headers.get('X-API-Key');
  if (request.method !== 'POST') {
    if (!clientApiKey || clientApiKey !== env.API_ACCESS_KEY) {
      console.warn('[process-screenshot] Unauthorized API access attempt to non-POST endpoint');
      return new Response('Unauthorized: Invalid or missing API Key', { status: 401 });
    }
    return new Response(`Method ${request.method} Not Allowed`, { status: 405, headers: { 'Allow': 'POST' } });
  }
  return new Response('Please use POST method to process a screenshot.', { status: 405 });
}) as unknown as PagesFunction<Env>; 