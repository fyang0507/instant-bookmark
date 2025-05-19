import type { PagesFunction, EventContext } from '@cloudflare/workers-types';

// Define the expected response format
interface ProcessedContentResponse {
  title: string;
  summary: string;
  uploadId?: string; // Changed from imageUrl to uploadId
}

// Define the environment variables that the Worker expects.
export interface Env {
  API_ACCESS_KEY: string; // Shared secret for clients to access the API
  NOTION_API_KEY: string; // Notion API Key for uploading files
  // OPENAI_API_KEY etc. if needed
}

export const onRequestPost = (async (context: EventContext<Env, string, unknown>) => {
  const { request, env } = context;
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
      
      // Check if fileValue exists, is not a string, and has file-like properties
      if (!fileValue || typeof fileValue === 'string' || 
          typeof (fileValue as File).name === 'undefined' || 
          typeof (fileValue as File).size === 'undefined') { 
        return new Response('Missing or invalid \'file\' in FormData', { status: 400 });
      }
      
      // If the checks pass, we can be reasonably sure it's a File object for Cloudflare Workers
      const file = fileValue as File;
      
      // --- Notion File Upload: Step 1 - Create File Upload --- 
      const createUploadPayload = {
        name: file.name,
        mime_type: file.type || 'application/octet-stream', // Provide a default MIME type
        mode: 'single_part',
      };

      console.log(`[process-screenshot] Step 1: Creating Notion file upload for ${file.name}...`, createUploadPayload);

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
        console.error('[process-screenshot] Notion create file upload failed:', createUploadResponse.status, errorText);
        return new Response(`Failed to initiate screenshot upload with Notion: ${errorText}`, { status: createUploadResponse.status });
      }

      const uploadData = await createUploadResponse.json() as { id: string; url: string; [key: string]: any };
      const uploadId = uploadData.id;
      const sendUrl = uploadData.url; // This is the URL to send the file bytes to

      if (!uploadId || !sendUrl) {
        console.error('[process-screenshot] Notion create file upload response missing id or url:', uploadData);
        return new Response('Invalid response from Notion API when creating file upload.', { status: 500 });
      }

      console.log(`[process-screenshot] Step 1 successful. Upload ID: ${uploadId}, Send URL: ${sendUrl}`);

      // --- Notion File Upload: Step 2 - Send File Bytes --- 
      const fileFormData = new FormData();
      fileFormData.append('file', file, file.name);

      console.log(`[process-screenshot] Step 2: Sending file bytes for ${file.name} to ${sendUrl}...`);

      const sendFileResponse = await fetch(sendUrl, { // Use the URL from Step 1 response
        method: 'POST',
        headers: {
          // Notion docs say to use multipart/form-data, and fetch handles Content-Type for FormData.
          // Crucially, for this specific endpoint, Notion docs DO NOT specify Notion-Version or Authorization headers.
          // This is unusual but we follow the docs for the specific endpoint: https://developers.notion.com/reference/send-a-file-upload
        },
        body: fileFormData,
      });

      if (!sendFileResponse.ok) {
        const errorText = await sendFileResponse.text();
        console.error('[process-screenshot] Notion send file bytes failed:', sendFileResponse.status, errorText);
        // It might be useful to try and complete the upload with Notion if possible, or handle cleanup.
        // For now, return an error.
        return new Response(`Failed to send screenshot data to Notion: ${errorText}`, { status: sendFileResponse.status });
      }
      
      console.log(`[process-screenshot] Step 2 successful. File bytes sent for ${uploadId}.`);

      // --- Notion File Upload: Step 3 (Complete) is not done here. --- 
      // The Python example calls a /complete endpoint, but the Send a file upload doc doesn't show it.
      // The Python code directly appends the block using the upload_id from step 1.
      // We will return the uploadId to the client, and the /save-to-notion function will append the block.

      const dummyTitle = "Processed Screenshot"; 
      const dummySummary = "THIS IS A TEST SCREENSHOT SUMMARY";

      const responseBody: ProcessedContentResponse = {
        title: dummyTitle,
        summary: dummySummary,
        uploadId: uploadId, // Return the uploadId
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