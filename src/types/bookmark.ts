export interface Bookmark {
  id: string;
  title: string;
  summary: string;
  source: 'url' | 'screenshot';
  url?: string;
  thoughts?: string;
  uploadId?: string;
  createdAt: string;
}