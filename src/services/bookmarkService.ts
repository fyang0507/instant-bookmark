import { Bookmark } from '../types/bookmark';

// Process URL to extract title and content
export const processUrl = async (url: string): Promise<{ title: string; summary: string }> => {
  const response = await fetch('/api/process-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': import.meta.env.VITE_API_ACCESS_KEY as string,
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    throw new Error('Failed to process URL');
  }

  return response.json();
};

// Process screenshot to generate title and content
export const processScreenshot = async (file: File, autoGenerate: boolean, manualTitle?: string, manualSummary?: string): Promise<{ title: string; summary: string; uploadId?: string; }> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('autoGenerate', String(autoGenerate));
  if (!autoGenerate && manualTitle && manualSummary) {
    formData.append('manualTitle', manualTitle);
    formData.append('manualSummary', manualSummary);
  }

  const response = await fetch('/api/process-screenshot', {
    method: 'POST',
    headers: {
      // 'Content-Type': 'multipart/form-data' is set automatically by the browser for FormData
      'X-API-Key': import.meta.env.VITE_API_ACCESS_KEY as string, // Add API Key header
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to process screenshot');
  }

  return response.json();
};

// Save bookmark to Notion (via backend API)
export const saveToNotion = async (bookmark: Omit<Bookmark, 'id' | 'createdAt'>): Promise<void> => {
  const response = await fetch('/api/save-to-notion', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': import.meta.env.VITE_API_ACCESS_KEY as string,
    },
    body: JSON.stringify(bookmark),
  });

  if (!response.ok) {
    // You might want to get more error details from the response body if your API provides them
    const errorData = await response.text(); // or response.json() if your API returns JSON errors
    console.error('Failed to save to Notion through backend:', errorData);
    throw new Error(`Failed to save to Notion: ${response.statusText} - ${errorData}`);
  }
};