# Instant Bookmark iOS Shortcut

This document provides instructions on how to install and use the "Instant Bookmark" iOS Shortcut (`Instant-Bookmark.shortcut`). This shortcut allows you to quickly save bookmarks to your Instant Bookmark account directly from your iOS device.

## Prerequisites

*   An iOS device (iPhone or iPad) running a version that supports the Shortcuts app.
*   The `Instant-Bookmark.shortcut` file.
*   The API endpoint configuration on Cloudflare

## Installation

1.  **Download the Shortcut File**: Make sure you have the `Instant-Bookmark.shortcut` file saved to your iOS device (e.g., in your Files app).
2.  **Enable Untrusted Shortcuts (If Necessary)**:
    *   If you haven't installed shortcuts from outside the Gallery before, you might need to allow untrusted shortcuts.
    *   Go to `Settings` > `Shortcuts`.
    *   Enable `Allow Untrusted Shortcuts`. You may need to run any shortcut from the gallery once for this option to appear.
3.  **Import the Shortcut**:
    *   Open the `Files` app and navigate to where you saved `Instant-Bookmark.shortcut`.
    *   Tap on the file. The Shortcuts app should open automatically.
    *   Review the shortcut's actions and tap `Add Untrusted Shortcut` (or `Add Shortcut` if the untrusted setting isn't an issue).
4.  **Configure the Shortcut (If Applicable)**:
    *   After adding the shortcut, open the Shortcuts app.
    *   Find "Instant Bookmark" in your list of shortcuts.
    *   Tap the three dots (`...`) on the shortcut to open its editor.
    *   Look for any fields that require your specific information, such as an API endpoint, API key, or user token. Update these as necessary. The shortcut should have comments or placeholder text indicating what needs to be changed.

## How to Use

See the main [README.md](../../README.md) for the demo use case. You can invoke this shortcut from the photo, the screenshot, or the web browser.

## Privacy
Check Apple
s official [Shortcuts User Guide](https://support.apple.com/guide/shortcuts/adjust-privacy-settings-apd961a4fc65/8.0/ios/18.0) if you run into privacy-related errors.