import { Bookmark } from '../types/bookmark';

// Process URL to extract title and content
export const processUrl = async (url: string): Promise<{ title: string; content: string }> => {
  const response = await fetch('/api/process-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    throw new Error('Failed to process URL');
  }

  return response.json();
};

// Process screenshot to generate title and content
export const processScreenshot = async (file: File): Promise<{ title: string; content: string }> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/process-screenshot', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to process screenshot');
  }

  return response.json();
};

// Save bookmark to Notion
export const saveToNotion = async (bookmark: Omit<Bookmark, 'id' | 'createdAt'>): Promise<void> => {
  const response = await fetch('/api/save-to-notion', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bookmark),
  });

  if (!response.ok) {
    throw new Error('Failed to save to Notion');
  }
};