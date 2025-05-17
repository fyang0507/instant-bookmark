export interface Bookmark {
  id: string;
  title: string;
  content: string;
  source: 'url' | 'screenshot';
  url?: string;
  createdAt: string;
}