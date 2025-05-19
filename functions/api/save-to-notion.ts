// functions/api/save-to-notion.ts

import type { PagesFunction, EventContext, Request as CfRequest } from '@cloudflare/workers-types';

// Define interfaces for the expected bookmark data from the frontend
interface BookmarkData {
  title: string;
  summary: string;
  source: 'url' | 'screenshot';
  url?: string;
  thoughts?: string;
  uploadId?: string; // Changed from imageUrl to uploadId
}

// Define interfaces for Notion API Page structure
interface NotionText {
  content: string;
}

interface NotionRichTextItem {
  type: 'text';
  text: NotionText;
  annotations?: {
    bold?: boolean; italic?: boolean; strikethrough?: boolean; underline?: boolean; code?: boolean; color?: string;
  };
}

interface NotionTitlePropertyValue {
  title: NotionRichTextItem[];
}

interface NotionSelectOption {
  name: string;
}

// Add a new interface for MultiSelect
interface NotionMultiSelectPropertyValue {
  multi_select: NotionSelectOption[];
}

// Add other property types as needed, e.g., for URL property type

interface NotionPageProperties {
  Title: NotionTitlePropertyValue;
  Tags?: NotionMultiSelectPropertyValue;
}

// For page content blocks
interface NotionParagraphBlockPayload {
  type: 'paragraph';
  paragraph: {
    rich_text: NotionRichTextItem[];
  };
}

interface NotionHeadingBlockPayload {
  type: 'heading_2';
  heading_2: {
    rich_text: NotionRichTextItem[];
  };
}

// Placeholder for future image block -> Updated for file & external types
interface NotionImageFilePayload { 
  url: string;
  // expiry_time?: string; // Optional: if Notion includes it for 'file' type URLs
}

interface NotionImageExternalPayload { 
  url: string;
}

interface NotionFileUploadPayload { // New payload for type: 'file_upload'
  id: string;
}

interface NotionImageContent {
  type: 'file' | 'external' | 'file_upload'; // Added 'file_upload'
  file?: NotionImageFilePayload;
  external?: NotionImageExternalPayload;
  file_upload?: NotionFileUploadPayload; // Added file_upload property
  caption?: NotionRichTextItem[]; 
}

interface NotionImageBlockPayload {
  type: 'image';
  image: NotionImageContent;
}

// New interfaces for bookmark block
interface NotionBookmarkPayload {
  url: string;
  caption?: NotionRichTextItem[]; // Optional caption
}

interface NotionBookmarkBlockPayload {
  type: 'bookmark';
  bookmark: NotionBookmarkPayload;
}

type NotionBlockPayload = NotionParagraphBlockPayload | NotionHeadingBlockPayload | NotionImageBlockPayload | NotionBookmarkBlockPayload;

interface NotionPageCreatePayload {
  parent: { database_id: string };
  properties: NotionPageProperties;
  children?: NotionBlockPayload[];
}

// Interface for Notion API error response
interface NotionErrorResponse {
  object: 'error';
  status: number;
  code: string;
  message: string;
  request_id?: string;
}

// Define the environment variables that the Worker expects.
// These are set as secrets in the Cloudflare dashboard.
export interface Env {
  NOTION_API_KEY: string;
  NOTION_DATABASE_ID: string;
  API_ACCESS_KEY: string; // Shared secret for clients to access the API
}

// New handler for standard Worker signature, accepting CfRequest, no ctx
export async function handleSaveToNotionPost(
  request: CfRequest,
  env: Env
): Promise<Response> {
  try {
    const clientApiKey = request.headers.get('X-API-Key');
    if (!clientApiKey || clientApiKey !== env.API_ACCESS_KEY) {
      return new Response('Unauthorized: Invalid or missing API Key', { status: 401 });
    }

    const bookmark = await request.json() as BookmarkData;

    if (!bookmark || !bookmark.title || !bookmark.summary) {
      return new Response('Missing required bookmark data (title, summary).', { status: 400 });
    }

    const notionApiUrl = 'https://api.notion.com/v1/pages';
    const notionVersion = '2022-06-28';

    const pageProperties: NotionPageProperties = {
      Title: {
        title: [{ type: 'text', text: { content: bookmark.title } }],
      },
    };

    if (bookmark.source) {
      pageProperties.Tags = {
        multi_select: [{ name: bookmark.source === 'url' ? 'Website' : 'Screenshot' }],
      };
    }
    
    const pageChildren: NotionBlockPayload[] = [];

    if (bookmark.url) {
      pageChildren.push({ 
        type: 'bookmark',
        bookmark: { url: bookmark.url },
      });
    }

    if (bookmark.source === 'screenshot') {
      if (bookmark.uploadId) {
        pageChildren.push({
          type: 'image',
          image: {
            type: 'file_upload',
            file_upload: { id: bookmark.uploadId }, 
          },
        });
      } else {
        pageChildren.push({
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: "[Screenshot image not available (no uploadId)]"}}]
          }
        });
      }
    }
    
    if (bookmark.summary) {
      pageChildren.push({
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: "Summary:" } }],
        },
      });
      pageChildren.push({
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: bookmark.summary } }],
        },
      });
    }

    if (bookmark.thoughts) {
      pageChildren.push({
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: "My Thoughts:" } }],
        },
      });
      pageChildren.push({
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: bookmark.thoughts } }],
        },
      });
    }

    const pageData: NotionPageCreatePayload = {
      parent: { database_id: env.NOTION_DATABASE_ID },
      properties: pageProperties,
      children: pageChildren.length > 0 ? pageChildren : undefined,
    };

    const notionResponse = await fetch(notionApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': notionVersion,
      },
      body: JSON.stringify(pageData),
    });

    if (!notionResponse.ok) {
      const errorData = await notionResponse.json() as NotionErrorResponse;
      console.error('Notion API Error:', errorData);
      const errorMessage = errorData.message || notionResponse.statusText;
      return new Response(`Failed to save to Notion: ${errorMessage}`, { status: notionResponse.status });
    }

    return new Response('Bookmark saved to Notion successfully!', { status: 200 });

  } catch (error: unknown) {
    console.error('[save-to-notion] Error processing request:', error instanceof Error ? error.message : error);
    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    } // Ensure there's a default response if none of the above conditions are met.
    return new Response(errorMessage, { status: 500 });
  }
}

export const onRequestPost = (async (context: EventContext<Env, string, unknown>) => {
  // Call worker-style handler, no ctx needed for handleSaveToNotionPost
  return handleSaveToNotionPost(context.request, context.env);
}) as unknown as PagesFunction<Env>;

// Fallback for other methods (GET, PUT, DELETE etc.) - Assumed to exist if not shown
export const onRequest = (async (context: EventContext<Env, string, unknown>) => {
    const { request, env } = context;
    const clientApiKey = request.headers.get('X-API-Key');
    if (request.method !== 'POST') {
      if (!clientApiKey || clientApiKey !== env.API_ACCESS_KEY) {
        console.warn('[save-to-notion] Unauthorized API access attempt to non-POST endpoint');
        return new Response('Unauthorized: Invalid or missing API Key', { status: 401 });
      }
      return new Response(`Method ${request.method} Not Allowed`, { status: 405, headers: { 'Allow': 'POST' } });
    }
    return new Response('Please use POST method to save to Notion.', { status: 405 });
  }) as unknown as PagesFunction<Env>; 