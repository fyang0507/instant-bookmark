# Instant-Bookmark Raycast Extension

This Raycast extension allows you to quickly save URLs and screenshots to Instant-Bookmark.

## Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/fyang0507/instant-bookmark.git
    ```
2.  **Navigate to the extension directory:**
    ```bash
    cd instant-bookmark/clients/raycast-extension
    ```
3.  **Install dependencies:**
    ```bash
    npm install
    ```
4.  **Build the extension:**
    ```bash
    npm run build
    ```
5.  **Open Raycast type "Import Extension". Select the `instant-bookmark/clients/raycast-extension` directory.**

## Configuration

Before using the extension, you need to configure your API key:

1.  Open Raycast and type "Instant Bookmark".
2.  Press `⌘ + ,` or `cmd + ,` to open the extension preferences.
3.  Enter your Instant Bookmark API Key in the "API Key" field.

## Usage

### Save a URL

1.  Open Raycast and type "Instant Bookmark".
2.  The extension will attempt to pre-fill the URL from your clipboard or the frontmost browser tab.
3.  Optionally, add any thoughts or notes about the URL.
4.  Press Enter to save the bookmark.

### Save a Screenshot

1.  Take a screenshot.
2.  Open Raycast and type "Instant Bookmark".
3.  The extension will detect the image in your clipboard.
4.  Optionally, add any thoughts or notes about the screenshot.
5.  Press Enter to save the screenshot.

Alternatively, you can directly use the "Save Image" command if it appears after typing "Instant Bookmark", which will specifically look for an image in your clipboard.

## Development

To develop the extension:

1.  Follow the installation steps above.
2.  Run the development command:
    ```bash
    npm run dev
    ```
    This will start the Raycast development environment, and the extension will reload automatically when you make changes.

To lint the code:
```bash
npm run lint
```

To fix linting issues:
```bash
npm run fix-lint
```
