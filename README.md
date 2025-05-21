<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./public/logo-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="./public/logo-light.png">
    <img alt="Instant Bookmark Logo" src="./public/logo-dark.png" width="200">
  </picture>
</p>

<p align="center">
  <!-- Made with TypeScript -->
  <img src="https://img.shields.io/badge/Made%20with-%F0%9F%92%BB%20TypeScript-blue?logo=typescript" alt="Made with TypeScript" />
  <!-- License -->
  <img src="https://img.shields.io/github/license/fyang0507/instant-bookmark?color=green" alt="License" />
  <!-- Cloudflare Workers -->
  <img src="https://img.shields.io/badge/Deployed%20on-Cloudflare%20Workers-orange?logo=cloudflare" alt="Deployed on Cloudflare Workers" />
</p>


<h1 align="left">Instant Bookmark </h1>

**Never miss any inspirations even in multi-tasking. Save anything to Notion, instantly. From anywhere.**

Instant Bookmark is a service to quickly save URLs and screenshots to Notion, with support for web, iOS Shortcuts, and Raycast. It leverages Cloudflare Workers for backend processing and a Vite-based React frontend.

## Demo

## Tech Stack

*   **Frontend**: React, TypeScript, Vite, Tailwind CSS
*   **Backend**: Cloudflare Workers (TypeScript)
*   **Browser Automation**: Browserless (for tasks requiring a headless browser, like advanced URL processing or screenshot)
*   **Primary Integration**: Notion API
*   **Planned Client Integrations**: iOS Shortcuts, Raycast

## Key Features

*   Save URLs or screenshots to Notion.
*   Summarize URLs/screenshot using cost-effective 4.1-nano.
*   Secure API for client communication.
*   Free, Easy deployment via Cloudflare Workers and Browserless.

## Getting Started

### Prerequisites

*   Node.js and npm (or yarn)
*   Wrangler CLI: `npm install -g wrangler` (or `yarn global add wrangler`)
*   A Notion account and an integration token.
*   A Notion database set up for bookmarks.

### Local Development Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd instant-bookmark
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**

    *   **For Cloudflare Functions (Backend):**
        Create a `.dev.vars` file in the project root (and add it to `.gitignore`). This file will hold secrets for your local Cloudflare Functions development.
        ```ini
        NOTION_API_KEY="your_notion_api_key"
        NOTION_DATABASE_ID="your_notion_database_id"
        API_ACCESS_KEY="your_secure_local_api_key_for_backend"
        OPENAI_API_KEY="your_openai_api_key" 
        BROWSERLESS_TOKEN="your_browserless_token"
        ```

    *   **For Vite Frontend:**
        Create a `.env` file in the project root (and add it to `.gitignore`). This file will hold variables for your local Vite frontend development.
        ```ini
        VITE_API_ACCESS_KEY="your_secure_local_api_key_for_frontend" # Should be the same as API_ACCESS_KEY in .dev.vars
        ```
        **Note:** The `API_ACCESS_KEY` in `.dev.vars` and `VITE_API_ACCESS_KEY` in `.env` must be the same for the frontend to authenticate with the backend services.

4.  **Run the development server:**
    Wrangler is used to serve both the frontend and the Cloudflare Functions locally.
    ```bash
    wrangler pages dev -- npm run dev
    ```
    This command makes variables from `.dev.vars` available to your functions, and Vite uses variables from `.env` for the frontend. The application will typically be available at `http://localhost:5173/`.

### API Authentication

All backend Cloudflare Worker functions (under `functions/api/`) expect an `API_ACCESS_KEY` to be sent in the `X-API-Key` request header. The backend validates this key against the `API_ACCESS_KEY` secret defined in its environment. Requests with missing or invalid keys will be rejected.

## Backend API Endpoints

*   **`/api/save-to-notion`**: Accepts bookmark data (URL, title, summary, thoughts, etc.) and saves it to the configured Notion database.
*   **`/api/process-url`**: Accepts a URL, fetches metadata, use AI to extracts main content, and returns the extracted title and content.
*   **`/api/process-screenshot`**: Accepts an image file, processes it (AI vision model), and returns extracted title and content.

## Future Integrations

The goal is to make Instant Bookmark accessible from various platforms for quick and seamless bookmarking.

* iOS Shortcut
* Raycast Extension

## Technical Notes

### `playwright-mcp` and Cloudflare Workers

An attempt was made to use `playwright-mcp` for advanced browser automation tasks, potentially for more robust URL processing or screenshot generation. However, this approach was found to be incompatible with the Cloudflare Workers environment.

*   **Reason**: Cloudflare Workers have a restricted runtime environment that does not allow the spawning of child processes (`child_process.spawn`), which is a capability `playwright-mcp` relies on to control a browser instance. This limitation is in place for security and resource management reasons within the serverless environment.
*   **Alternative**: To handle browser automation tasks like rendering JavaScript-heavy sites or backend screenshots, this project uses [Browserless.io](https://www.browserless.io/). Cloudflare Workers call the Browserless API, leveraging its remote headless browsers (free tier available) for complex URL processing and screenshot. This bypasses Worker limitations while still enabling full browser capabilities when needed. Simpler content fetching uses standard `fetch`. Clients can also directly upload screenshots.

## Project Structure

*   **`src/`**: Frontend React application (Vite, TypeScript, Tailwind CSS).
    *   `src/components/`: Reusable UI components.
    *   `src/pages/`: Page components.
    *   `src/services/`: API call modules.
*   **`functions/`**: Backend Cloudflare Worker functions (TypeScript).
    *   `functions/api/`: API endpoint implementations.
*   **`public/`**: Static assets for the frontend.

## Completely Vibe-coded
This project is made possibly thanks to [bolt](https://bolt.new/) and [cursor](https://www.cursor.com/).