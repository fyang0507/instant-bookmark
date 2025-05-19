instant-bookmark

## Development Status & Action Plan

This section outlines the current state of the Instant Bookmark application and the consolidated action plan to make it fully functional, including support for Web, iOS Shortcuts, and Raycast clients.

### Current Setup

*   **Frontend (Web)**: A Vite-based React application using TypeScript and Tailwind CSS.
    *   Core UI: `src/components/BookmarkForm.tsx`.
    *   API Service: `src/services/bookmarkService.ts` (calls backend API).
*   **Backend (Cloudflare Workers)**:
    *   `functions/api/save-to-notion.ts`: Handles saving bookmarks to Notion. Called by the frontend and other clients.
    *   The backend is intended to be the secure layer handling API keys and interactions with third-party services (Notion, AI services, etc.).

### Action Plan / TODOs

**Phase 1: Foundational Backend & API Setup**

1.  **Cloudflare Environment Setup (High Priority):**
    *   Create a Cloudflare Pages project and link it to your Git repository.
    *   In the Cloudflare Pages project settings, define the following environment variables:
        *   **Secrets for Functions (Production & Preview):**
            *   `NOTION_API_KEY`: Your Notion integration token.
            *   `NOTION_DATABASE_ID`: The ID of your Notion database.
            *   `API_ACCESS_KEY`: A secure, unique key that your backend functions will use to authenticate requests from clients (Web UI, iOS, Raycast).
            *   *(Anticipate adding `OPENAI_API_KEY` or similar if URL/screenshot processing will use AI services).*
        *   **Build Environment Variables for Frontend (Production & Preview):**
            *   `VITE_API_ACCESS_KEY`: The same value as `API_ACCESS_KEY`. This will be embedded into your frontend SPA for it to make authenticated API calls.

2.  **Local Development Environment (High Priority):**
    *   Install the Wrangler CLI: `npm install -g wrangler` (or `yarn global add wrangler`).
    *   Create a `.dev.vars` file in the project root (and **add it to `.gitignore`**). Populate it with your local development secrets for your **Cloudflare Functions**:
        ```
        NOTION_API_KEY="your_local_notion_api_key"
        NOTION_DATABASE_ID="your_local_notion_database_id"
        API_ACCESS_KEY="your_secure_local_api_key"
        # Add OPENAI_API_KEY as needed
        ```
    *   Create a `.env` file in the project root (and **add it to `.gitignore`**). Populate it with your local development variables for your **Vite frontend**:
        ```
        VITE_API_ACCESS_KEY="your_secure_local_api_key" # Should be the same as API_ACCESS_KEY in .dev.vars
        ```
    *   Ensure you can run the project locally using Wrangler: `wrangler pages dev -- npm run dev`. This command makes variables from `.dev.vars` available to functions and Vite uses `.env` for the frontend.

3.  **API Authentication Strategy & Implementation (High Priority):**
    *   **Strategy:** A shared `API_ACCESS_KEY` will be used to authenticate requests to the backend Cloudflare Functions. All clients (Web UI, iOS Shortcut, Raycast) must send this key.
    *   **Implementation:**
        *   All Cloudflare Worker functions (`functions/api/*.ts`) must expect the `API_ACCESS_KEY` in an `X-API-Key` request header.
        *   The backend functions will validate the incoming `X-API-Key` against the `API_ACCESS_KEY` secret defined in their environment (Cloudflare secrets for deployed, `.dev.vars` for local).
        *   Return `401 Unauthorized` or `403 Forbidden` for invalid/missing keys.
        *   The `Env` interface in workers should include `API_ACCESS_KEY: string;`.
        *   The frontend (e.g., `src/services/bookmarkService.ts`) will use `import.meta.env.VITE_API_ACCESS_KEY` to send the key.
        *   *(Future: For more granular control, consider generating distinct API keys per client type and managing them via Cloudflare Workers KV).*

4.  **Implement Core Backend API Endpoints (Medium Priority):**
    *   **`/api/process-url`**:
        *   Create Cloudflare Worker file: `functions/api/process-url.ts`.
        *   Implement logic to accept a URL, process it (e.g., fetch metadata, extract main content using a readability library or an AI service like OpenAI), and return the extracted title and content.
        *   Incorporate API key authentication.
    *   **`/api/process-screenshot`**:
        *   Create Cloudflare Worker file: `functions/api/process-screenshot.ts`.
        *   Implement logic to accept an image file (multipart/form-data), process it (e.g., perform OCR, use an AI vision model like OpenAI Vision to generate a title and description), and return the extracted title and content.
        *   Incorporate API key authentication.

5.  **Notion Database & Integration Refinement (Medium Priority):**
    *   **Schema Review:** Verify that the `functions/api/save-to-notion.ts` worker correctly maps to your Notion database's title property (currently assumes "Name").
    *   **Property Mapping:** Decide if other fields (URL, Source, Thoughts, full Content) should map to specific Notion properties. If so, update your Notion database schema and the `pageData.properties` section in `functions/api/save-to-notion.ts`.

**Phase 2: Client Development & Repository Structure**

6.  **Repository Structure for Multi-Client Support (Medium Priority):**
    *   Create dedicated directories for client-specific code and documentation:
        *   `ios-shortcut/` (for notes, exported Shortcut files, setup instructions)
        *   `raycast-extension/` (for the Raycast extension source code, which will be its own Node.js/TypeScript project)
    *   *(Optional Consideration for later: `packages/` for a monorepo setup if shared types/API client becomes beneficial).*

7.  **iOS Shortcut Development (Medium Priority):**
    *   Design the user flow for the iOS Shortcut.
    *   Use the "Get Contents of URL" action to make POST requests to your Cloudflare API endpoints (`/api/process-url`, `/api/process-screenshot`, `/api/save-to-notion`).
    *   Include the generated client-specific API key in the request headers.
    *   Document setup (API endpoint URLs, how to input API key) in `ios-shortcut/README.md`.

8.  **Raycast Extension Development (Medium Priority):**
    *   Initialize a new Raycast extension project within `raycast-extension/`.
    *   Develop commands to capture input (URL, screenshot path, thoughts).
    *   Implement API calls (using `fetch` or a library) to your Cloudflare API endpoints, including the client-specific API key.
    *   Document build, installation, and configuration (API endpoint, API key) in `raycast-extension/README.md`.

**Phase 3: Web Frontend Enhancements & Deployment**

9.  **Web Frontend Styling & UI Enhancements (Low Priority - Ongoing):**
    *   Continue to refine the UI/UX of the `BookmarkForm` and other web components.

10. **Deployment & Testing (Medium Priority - Iterative):**
    *   Regularly deploy your Cloudflare Pages project (which includes Workers) to test changes.
    *   Test all clients (Web, iOS Shortcut, Raycast) against the deployed environment.

**Phase 4: Advanced Features & Future Considerations**

11. **Shared Types/API Client (Optional - Low Priority):**
    *   If code duplication (especially for TypeScript types or API call logic) becomes an issue between the Raycast extension, web frontend, or even backend, consider setting up a monorepo (e.g., using npm/yarn/pnpm workspaces) with a shared `packages/types` or `packages/api-client`.

12. **Rate Limiting (Low Priority):**
    *   Once operational, consider configuring rate limiting on your Cloudflare API endpoints to prevent abuse.

13. **More Advanced Authentication (Low Priority):**
    *   If user accounts or more granular permissions become necessary, explore OAuth 2.0 or Cloudflare Access with user-based policies.

By tackling these steps, you'll build a robust and versatile bookmarking application!
