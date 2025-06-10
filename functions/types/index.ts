// functions/types/index.ts
export interface Env {
  API_ACCESS_KEY: string;
  NOTION_API_KEY: string; // Used by process-screenshot and potentially other services
  OPENAI_API_KEY?: string; // Placeholder for future LLM calls
  OPENAI_BASE_URL?: string; // Base URL for OpenAI-compatible API providers
  MCP_CONNECTION_STRING?: string; // Connection string for Playwright MCP
  // Add other environment variables that might be shared across functions
}

export interface LlmContentResponse {
  title: string;
  summary: string;
} 