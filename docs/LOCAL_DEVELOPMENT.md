### Local Development Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/fyang0507/instant-bookmark.git
    cd instant-bookmark
    ```

2.  **Install dependencies:**
    *   Node.js and npm (recommended to install via `brew` using `brew install node`, if you don't have brew, follow [this guide](https://brew.sh/))
    *   Wrangler CLI (CloudFlare's CLI): `npm install -g wrangler`
    *   Install the package: `npm install`

3.  **Configure Environment Variables:**

    *   **For Cloudflare Functions (Backend):**
        Create a `.dev.vars` file in the project root (and add it to `.gitignore`). This file will hold secrets for your local Cloudflare Functions development.
        ```ini
        NOTION_API_KEY=your_notion_api_key # request from: https://developers.notion.com/
        NOTION_DATABASE_ID=your_notion_database_id # see this guide to retrieve the ID: https://developers.notion.com/reference/retrieve-a-database
        API_ACCESS_KEY=your_secure_local_api_key_for_backend # generate this yourself, e.g. you can use `openssl rand -hex 32`
        OPENAI_API_KEY=your_openai_api_key # requested from https://platform.openai.com/
        OPENAI_BASE_URL=https://api.openai.com/v1 # (optional) base URL for OpenAI-compatible providers, defaults to official OpenAI
        BROWSERLESS_TOKEN=your_browserless_token # sign up on https://www.browserless.io/ to get the token
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
    npx wrangler pages dev -- npm run dev
    ```
    This command makes variables from `.dev.vars` available to your functions, and Vite uses variables from `.env` for the frontend. The application will typically be available at `http://localhost:5173/`, you'll see options from the terminal when you launch it.

### API Authentication

All backend Cloudflare Worker functions (under `functions/api/`) expect an `API_ACCESS_KEY` to be sent in the `X-API-Key` request header. The backend validates this key against the `API_ACCESS_KEY` secret defined in its environment. Requests with missing or invalid keys will be rejected.

You can generate a secure API key for your application using OpenSSL: `openssl rand -hex 32` 