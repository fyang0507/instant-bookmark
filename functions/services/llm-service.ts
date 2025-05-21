import type { Env, LlmContentResponse } from '../types';
import OpenAI from "openai";
import { Buffer } from "node:buffer"; // Explicitly import Buffer
// The comment "import { Buffer } from \"node:buffer\"; // polyfill provided by Workers" 
// implies Buffer is available. Cloudflare Workers provide a Buffer polyfill.

/**
 * Generates content (title and summary) based on a screenshot file.
 * Uses OpenAI GPT-4.1 API via the OpenAI SDK.
 * 
 * @param file The screenshot file to process.
 * @param env Environment variables, including OPENAI_API_KEY.
 * @returns A promise that resolves to an LlmContentResponse.
 */
export async function generateContentForScreenshot(
  file: File, 
  env: Env
): Promise<LlmContentResponse> {
  if (!env.OPENAI_API_KEY) {
    console.error('[llm-service] OPENAI_API_KEY is not set. Returning dummy data.');
    return {
      title: "Processed Screenshot Title (Dummy - OpenAI Key Missing)",
      summary: "This is a dummy summary because the OpenAI API key was not provided.",
    };
  }

  try {
    console.log(`[llm-service] Processing screenshot: ${file.name} with OpenAI gpt-4o-mini.`);

    const arrayBuffer = await file.arrayBuffer();
    // Buffer should be globally available in Workers environment
    const base64Image = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:${file.type};base64,${base64Image}`;

    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });

    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are an AI assistant. Reply ONLY with a JSON object that has two keys: 'title' (string, concise, max 10 words) and 'summary' (string, short, max 50 words)."
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this image and provide a title and summary based on its content." },
            { 
              type: "image_url", 
              image_url: { 
                url: dataUrl, 
                detail: "low" 
              } 
            }
          ]
        }
      ],
      max_tokens: 150,
    });

    const messageContent = chatCompletion.choices[0]?.message?.content;

    if (!messageContent) {
      console.error('[llm-service] OpenAI response missing message content:', chatCompletion);
      throw new Error('Invalid response structure from OpenAI API: No message content.');
    }

    let parsedContent: LlmContentResponse;
    try {
      parsedContent = JSON.parse(messageContent);
    } catch (parseError) {
      console.error('[llm-service] Error parsing JSON from OpenAI response:', parseError, "Raw content:", messageContent);
      throw new Error('Failed to parse JSON content from OpenAI.');
    }

    if (!parsedContent.title || !parsedContent.summary) {
        console.error('[llm-service] OpenAI response JSON missing title or summary:', parsedContent);
        throw new Error('OpenAI response JSON is missing title or summary fields.');
    }

    console.log('[llm-service] Successfully generated content from OpenAI for screenshot.');
    return {
      title: parsedContent.title,
      summary: parsedContent.summary,
    };

  } catch (e: unknown) { // Type the error as unknown first
    console.error('[llm-service] Error in generateContentForScreenshot:', e);
    // Check if the error is an APIError from the OpenAI SDK for more specific details
    if (e instanceof OpenAI.APIError) {
        console.error('[llm-service] OpenAI APIError details:', e.status, e.headers, e.error);
        return {
            title: `Content Generation Failed (API Error ${e.status})`,
            summary: `OpenAI API Error: ${e.message}`,
        };
    }
    // Generic error fallback
    let errorMessage = 'Unknown error during LLM processing';
    if (e instanceof Error) {
        errorMessage = e.message;
    }
    return {
      title: "Content Generation Failed",
      summary: `Error processing screenshot with LLM: ${errorMessage}`,
    };
  }
}

/**
 * Generates content (title and summary) based on a URL.
 * Currently returns dummy data.
 * 
 * @param url The URL to process.
 * @param env Environment variables, potentially including an LLM API key.
 * @returns A promise that resolves to an LlmContentResponse.
 */
export async function generateContentForUrl(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  url: string, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  env: Env
): Promise<LlmContentResponse> {
  // TODO: Replace with actual LLM call to fetch and process the URL content (e.g., using OpenAI)
  console.log('[llm-service] Generating content for URL (dummy data)');
  return {
    title: "Processed URL Title (from LLM service)",
    summary: "This is a dummy summary for the URL from the LLM service.",
  };
} 