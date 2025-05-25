import { Bookmark } from '../types/bookmark';

const VITE_API_ACCESS_KEY = import.meta.env.VITE_API_ACCESS_KEY as string;

// Helper function to handle API errors
const handleApiError = async (response: Response, defaultMessage: string, apiEndpointPath: string) => {
  let errorMessage = defaultMessage;
  const clonedResponse = response.clone(); // Clone for fallback if JSON parsing consumes body

  try {
    // Attempt to parse as JSON from the original response
    const errorData = await response.json();
    if (errorData && errorData.message) {
      errorMessage = errorData.message;
    } else if (response.statusText) {
      // If JSON is valid but no 'message' field, or if errorData is null/undefined
      errorMessage = response.statusText;
    }
    // If no errorData.message and no response.statusText, defaultMessage will be used.
  } catch { // Catches errors from response.json()
    // JSON parsing failed (e.g., body is not JSON, or response.json() itself failed)
    // Try to read the body as text from the cloned response
    try {
      const textData = await clonedResponse.text();
      if (textData) {
        errorMessage = textData; // Use the full text response
      } else if (response.statusText) { // response.statusText is from original response
        // Fallback to statusText if textData from clone is empty
        errorMessage = response.statusText;
      }
      // If textData is empty and no statusText, defaultMessage will be used
    } catch { // Catches errors from clonedResponse.text()
      // Reading as text from clone also failed (e.g., network issue with clone)
      // Fall back to original response's statusText or the defaultMessage
      if (response.statusText) {
        errorMessage = response.statusText;
      }
      // If no statusText, errorMessage remains defaultMessage
    }
  }
  throw new Error(`[${apiEndpointPath}] ${errorMessage}`);
};

// Centralized API fetch helper
interface ApiFetchOptions extends RequestInit {
  defaultErrorMessage: string;
}

const apiFetch = async (apiPath: string, options: ApiFetchOptions): Promise<Response> => {
  const { defaultErrorMessage, ...fetchOptions } = options;

  const response = await fetch(apiPath, {
    ...fetchOptions,
    headers: {
      ...fetchOptions.headers,
      'X-API-Key': VITE_API_ACCESS_KEY,
    },
  });

  if (!response.ok) {
    // handleApiError will throw, so no need to return here
    await handleApiError(response, defaultErrorMessage, apiPath);
    // The line below is unreachable due to handleApiError throwing, but satisfies TypeScript
    throw new Error('API request failed after handleApiError was expected to throw.'); 
  }
  return response;
};

// Process URL to extract title and content
export const processUrl = async (url: string): Promise<{ title: string; summary: string }> => {
  const apiPath = '/api/process-url';
  const response = await apiFetch(apiPath, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
    defaultErrorMessage: 'Failed to process URL',
  });
  return response.json();
};

// Process screenshot to generate title and content
export const processScreenshot = async (file: File, autoGenerate: boolean, manualTitle?: string, manualSummary?: string): Promise<{ title: string; summary: string; uploadId?: string; }> => {
  const apiPath = '/api/process-screenshot';
  const formData = new FormData();
  formData.append('file', file);
  formData.append('autoGenerate', String(autoGenerate));
  if (!autoGenerate && manualTitle && manualSummary) {
    formData.append('manualTitle', manualTitle);
    formData.append('manualSummary', manualSummary);
  }

  const response = await apiFetch(apiPath, {
    method: 'POST',
    // 'Content-Type': 'multipart/form-data' is set by browser for FormData
    body: formData,
    defaultErrorMessage: 'Failed to process screenshot',
  });
  return response.json();
};

// Save bookmark to Notion (via backend API)
export const saveToNotion = async (bookmark: Omit<Bookmark, 'id' | 'createdAt'>): Promise<void> => {
  const apiPath = '/api/save-to-notion';
  await apiFetch(apiPath, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bookmark),
    defaultErrorMessage: 'Failed to save to Notion',
  });
  // No explicit return for a successful void promise, as apiFetch handles non-OK responses by throwing.
};